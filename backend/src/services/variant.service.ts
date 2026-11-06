import type { ProductVariant } from "@prisma/client";
import { ProductRepository } from "../repositories/product.repository";
import {
  type CreateVariantData,
  type UpdateVariantData,
  VariantRepository,
} from "../repositories/variant.repository";

export class VariantError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "VariantError";
    this.statusCode = statusCode;
  }
}

export interface VariantInputItem {
  size?: unknown;
  color?: unknown;
  stock?: unknown;
}

export type CreateVariantsPayload =
  | VariantInputItem
  | {
      variants?: VariantInputItem[];
    };

export interface VariantRepositoryPort {
  findByProductId: (productId: string) => Promise<ProductVariant[]>;
  findById: (id: string) => Promise<ProductVariant | null>;
  findByProductSizeColorInsensitive: (
    productId: string,
    size: string,
    color: string,
    excludeVariantId?: string
  ) => Promise<ProductVariant | null>;
  create: (data: CreateVariantData) => Promise<ProductVariant>;
  createManyAtomic: (items: CreateVariantData[]) => Promise<ProductVariant[]>;
  update: (id: string, data: UpdateVariantData) => Promise<ProductVariant>;
  delete: (id: string) => Promise<ProductVariant>;
  hasOrderItems: (variantId: string) => Promise<boolean>;
}

export interface ProductExistsPort {
  findById?: (id: string) => Promise<{ id: string } | null>;
  findAdminById?: (id: string) => Promise<{ id: string } | null>;
}

export class VariantService {
  private readonly variantRepository: VariantRepositoryPort;
  private readonly productRepository: ProductExistsPort;

  constructor(
    variantRepository: VariantRepositoryPort = new VariantRepository(),
    productRepository: ProductExistsPort = new ProductRepository()
  ) {
    this.variantRepository = variantRepository;
    this.productRepository = productRepository;
  }

  private async ensureProductExists(productId: string): Promise<void> {
    if (!productId || typeof productId !== "string" || !productId.trim()) {
      throw new VariantError("ID do produto inválido.", 400);
    }
    const lookup =
      this.productRepository.findById?.bind(this.productRepository) ??
      this.productRepository.findAdminById?.bind(this.productRepository);
    const product = lookup ? await lookup(productId) : null;
    if (!product) {
      throw new VariantError("Produto não encontrado.", 404);
    }
  }

  private normalizeSize(rawSize: unknown): string {
    if (typeof rawSize !== "string" || !rawSize.trim()) {
      throw new VariantError("O tamanho (size) da variação é obrigatório.", 400);
    }
    return rawSize.trim().toUpperCase();
  }

  private normalizeColor(rawColor: unknown): string {
    if (typeof rawColor !== "string" || !rawColor.trim()) {
      throw new VariantError("A cor (color) da variação é obrigatória.", 400);
    }
    return rawColor.trim();
  }

  private normalizeStock(rawStock: unknown, defaultIfUndefined = true): number {
    if (rawStock === undefined) {
      if (defaultIfUndefined) {
        return 0;
      }
      throw new VariantError("Estoque (stock) inválido.", 400);
    }
    if (typeof rawStock !== "number" || !Number.isInteger(rawStock) || rawStock < 0) {
      throw new VariantError(
        "O estoque (stock) deve ser um número inteiro maior ou igual a zero.",
        400
      );
    }
    return rawStock;
  }

  async listByProduct(productId: string): Promise<ProductVariant[]> {
    await this.ensureProductExists(productId);
    return this.variantRepository.findByProductId(productId);
  }

  async createVariants(
    productId: string,
    payload: CreateVariantsPayload
  ): Promise<ProductVariant | ProductVariant[]> {
    await this.ensureProductExists(productId);

    if (!payload || typeof payload !== "object") {
      throw new VariantError("Dados da variação inválidos.", 400);
    }

    const isBatch = "variants" in payload && payload.variants !== undefined;

    if (isBatch) {
      const list = payload.variants;
      if (!Array.isArray(list) || list.length === 0) {
        throw new VariantError(
          "A lista de variações (variants) deve conter ao menos um item.",
          400
        );
      }

      const normalizedItems: CreateVariantData[] = [];
      const seenKeys = new Set<string>();

      for (const item of list) {
        const size = this.normalizeSize(item?.size);
        const color = this.normalizeColor(item?.color);
        const stock = this.normalizeStock(item?.stock, true);
        const key = `${size.toLowerCase()}::${color.toLowerCase()}`;

        if (seenKeys.has(key)) {
          throw new VariantError(
            `Variação duplicada no lote para tamanho "${size}" e cor "${color}".`,
            409
          );
        }
        seenKeys.add(key);

        normalizedItems.push({
          productId,
          size,
          color,
          stock,
        });
      }

      for (const item of normalizedItems) {
        const existing = await this.variantRepository.findByProductSizeColorInsensitive(
          productId,
          item.size,
          item.color
        );
        if (existing) {
          throw new VariantError(
            `Já existe uma variação cadastrada com tamanho "${item.size}" e cor "${item.color}" para este produto.`,
            409
          );
        }
      }

      return this.variantRepository.createManyAtomic(normalizedItems);
    }

    const singleInput = payload as VariantInputItem;
    const size = this.normalizeSize(singleInput.size);
    const color = this.normalizeColor(singleInput.color);
    const stock = this.normalizeStock(singleInput.stock, true);

    const existing = await this.variantRepository.findByProductSizeColorInsensitive(
      productId,
      size,
      color
    );
    if (existing) {
      throw new VariantError(
        `Já existe uma variação cadastrada com tamanho "${size}" e cor "${color}" para este produto.`,
        409
      );
    }

    return this.variantRepository.create({
      productId,
      size,
      color,
      stock,
    });
  }

  async updateVariant(
    productId: string,
    variantId: string,
    input: VariantInputItem
  ): Promise<ProductVariant> {
    await this.ensureProductExists(productId);

    const existing = await this.variantRepository.findById(variantId);
    if (!existing || existing.productId !== productId) {
      throw new VariantError("Variação não encontrada para este produto.", 404);
    }

    const updateData: UpdateVariantData = {};

    if (input.size !== undefined) {
      updateData.size = this.normalizeSize(input.size);
    }
    if (input.color !== undefined) {
      updateData.color = this.normalizeColor(input.color);
    }
    if (input.stock !== undefined) {
      updateData.stock = this.normalizeStock(input.stock, false);
    }

    const nextSize = updateData.size ?? existing.size;
    const nextColor = updateData.color ?? existing.color;

    if (updateData.size !== undefined || updateData.color !== undefined) {
      const collision = await this.variantRepository.findByProductSizeColorInsensitive(
        productId,
        nextSize,
        nextColor,
        variantId
      );
      if (collision) {
        throw new VariantError(
          `Já existe outra variação com tamanho "${nextSize}" e cor "${nextColor}" para este produto.`,
          409
        );
      }
    }

    return this.variantRepository.update(variantId, updateData);
  }

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    await this.ensureProductExists(productId);

    const existing = await this.variantRepository.findById(variantId);
    if (!existing || existing.productId !== productId) {
      throw new VariantError("Variação não encontrada para este produto.", 404);
    }

    const linkedToOrders = await this.variantRepository.hasOrderItems(variantId);
    if (linkedToOrders) {
      throw new VariantError(
        "Não é possível excluir uma variação vinculada a pedidos registrados. Recomendamos zerar o estoque (stock = 0) para indisponibilizá-la na vitrine.",
        409
      );
    }

    await this.variantRepository.delete(variantId);
  }
}
