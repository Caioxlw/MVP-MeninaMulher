import type { Product, ProductImage } from "@prisma/client";
import { ProductImageRepository } from "../repositories/product-image.repository";
import { ProductRepository } from "../repositories/product.repository";

export interface AddProductImageInput {
  url?: unknown;
  altText?: unknown;
  position?: unknown;
  isPrimary?: unknown;
}

export interface UpdateProductImageInput {
  altText?: unknown;
  position?: unknown;
  isPrimary?: unknown;
}

export interface ProductLookupPort {
  findAdminById: (id: string) => Promise<Pick<Product, "id" | "name"> | null>;
}

export interface ProductImageServicePort {
  listByProduct: (productId: string) => Promise<ProductImage[]>;
  addProductImage: (productId: string, input: AddProductImageInput) => Promise<ProductImage>;
  updateProductImage: (
    productId: string,
    imageId: string,
    input: UpdateProductImageInput
  ) => Promise<ProductImage>;
  deleteProductImage: (productId: string, imageId: string) => Promise<void>;
}

export class ProductImageError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "ProductImageError";
    this.statusCode = statusCode;
  }
}

function parseOptionalPosition(rawPosition: unknown): number | undefined {
  if (rawPosition === undefined || rawPosition === null || rawPosition === "") {
    return undefined;
  }
  const parsed = typeof rawPosition === "number" ? rawPosition : Number(rawPosition);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ProductImageError(
      "A posição da foto deve ser um número inteiro maior ou igual a zero.",
      400
    );
  }
  return parsed;
}

function parseOptionalBoolean(raw: unknown): boolean {
  return raw === true || raw === "true";
}

/**
 * Camada de regras de negócio da galeria de fotos de produtos (`ProductImage` - PBI #17).
 * Garante texto alternativo acessível (`RNF07`) e consistência da foto principal (`position: 0`).
 */
export class ProductImageService implements ProductImageServicePort {
  private readonly imageRepository: ProductImageRepository;
  private readonly productRepository: ProductLookupPort;

  constructor(
    imageRepository: ProductImageRepository = new ProductImageRepository(),
    productRepository: ProductLookupPort = new ProductRepository()
  ) {
    this.imageRepository = imageRepository;
    this.productRepository = productRepository;
  }

  private async ensureProductExists(productId: string): Promise<Pick<Product, "id" | "name">> {
    const trimmedId = productId.trim();
    if (!trimmedId) {
      throw new ProductImageError("Produto não encontrado.", 404);
    }
    const product = await this.productRepository.findAdminById(trimmedId);
    if (!product) {
      throw new ProductImageError("Produto não encontrado.", 404);
    }
    return product;
  }

  async listByProduct(productId: string): Promise<ProductImage[]> {
    await this.ensureProductExists(productId);
    return this.imageRepository.findByProductId(productId);
  }

  async addProductImage(productId: string, input: AddProductImageInput): Promise<ProductImage> {
    const product = await this.ensureProductExists(productId);

    const trimmedUrl = typeof input?.url === "string" ? input.url.trim() : "";
    if (!trimmedUrl) {
      throw new ProductImageError("A URL ou arquivo da foto é obrigatório.", 400);
    }

    const rawAltText = typeof input?.altText === "string" ? input.altText.trim() : "";
    const resolvedAltText = rawAltText || product.name;

    const existingImages = await this.imageRepository.findByProductId(productId);
    const requestedPosition = parseOptionalPosition(input?.position);
    const wantsPrimary = parseOptionalBoolean(input?.isPrimary) || requestedPosition === 0;

    if (existingImages.length === 0) {
      return this.imageRepository.create({
        productId,
        url: trimmedUrl,
        altText: resolvedAltText,
        position: 0,
      });
    }

    if (wantsPrimary) {
      const created = await this.imageRepository.create({
        productId,
        url: trimmedUrl,
        altText: resolvedAltText,
        position: 0,
      });

      const reorderUpdates = [
        { id: created.id, position: 0 },
        ...existingImages.map((img, idx) => ({ id: img.id, position: idx + 1 })),
      ];
      await this.imageRepository.reorderPositions(reorderUpdates);
      return { ...created, position: 0 };
    }

    const targetPosition =
      requestedPosition !== undefined
        ? Math.min(requestedPosition, existingImages.length)
        : existingImages.length;

    const created = await this.imageRepository.create({
      productId,
      url: trimmedUrl,
      altText: resolvedAltText,
      position: targetPosition,
    });

    if (targetPosition < existingImages.length) {
      const reordered = [...existingImages];
      reordered.splice(targetPosition, 0, created);
      await this.imageRepository.reorderPositions(
        reordered.map((img, idx) => ({ id: img.id, position: idx }))
      );
    }

    return created;
  }

  async updateProductImage(
    productId: string,
    imageId: string,
    input: UpdateProductImageInput
  ): Promise<ProductImage> {
    const product = await this.ensureProductExists(productId);
    const existing = await this.imageRepository.findById(imageId);

    if (!existing || existing.productId !== productId) {
      throw new ProductImageError("Foto não encontrada para este produto.", 404);
    }

    let nextAltText = existing.altText;
    if (input?.altText !== undefined) {
      if (input.altText !== null && typeof input.altText !== "string") {
        throw new ProductImageError("O texto alternativo da foto deve ser um texto válido.", 400);
      }
      const trimmedAlt = typeof input.altText === "string" ? input.altText.trim() : "";
      nextAltText = trimmedAlt || product.name;
    }

    const requestedPosition = parseOptionalPosition(input?.position);
    const wantsPrimary = parseOptionalBoolean(input?.isPrimary);
    const targetPosition = wantsPrimary ? 0 : requestedPosition;

    if (targetPosition !== undefined) {
      const allImages = await this.imageRepository.findByProductId(productId);
      const others = allImages.filter((img) => img.id !== imageId);
      const clampedIndex = Math.min(targetPosition, others.length);
      const ordered = [...others];
      ordered.splice(clampedIndex, 0, { ...existing, altText: nextAltText });

      await this.imageRepository.reorderPositions(
        ordered.map((img, idx) => ({ id: img.id, position: idx }))
      );

      if (nextAltText !== existing.altText) {
        return this.imageRepository.update(imageId, {
          altText: nextAltText,
          position: clampedIndex,
        });
      }

      return {
        ...existing,
        altText: nextAltText,
        position: clampedIndex,
      };
    }

    return this.imageRepository.update(imageId, {
      altText: nextAltText,
    });
  }

  async deleteProductImage(productId: string, imageId: string): Promise<void> {
    await this.ensureProductExists(productId);
    const existing = await this.imageRepository.findById(imageId);

    if (!existing || existing.productId !== productId) {
      throw new ProductImageError("Foto não encontrada para este produto.", 404);
    }

    await this.imageRepository.delete(imageId);

    const remaining = await this.imageRepository.findByProductId(productId);
    if (remaining.length > 0) {
      await this.imageRepository.reorderPositions(
        remaining.map((img, idx) => ({ id: img.id, position: idx }))
      );
    }
  }
}
