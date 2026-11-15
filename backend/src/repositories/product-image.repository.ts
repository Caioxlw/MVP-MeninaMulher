import type { ProductImage } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface CreateProductImageData {
  productId: string;
  url: string;
  altText: string | null;
  position: number;
}

export interface UpdateProductImageData {
  altText?: string | null;
  position?: number;
}

export interface ProductImagePrismaDelegate {
  productImage: {
    findMany: (args: {
      where: { productId: string };
      orderBy?: Array<Record<string, "asc" | "desc">>;
    }) => Promise<ProductImage[]>;
    findUnique: (args: { where: { id: string } }) => Promise<ProductImage | null>;
    create: (args: { data: CreateProductImageData }) => Promise<ProductImage>;
    update: (args: {
      where: { id: string };
      data: UpdateProductImageData;
    }) => Promise<ProductImage>;
    delete: (args: { where: { id: string } }) => Promise<ProductImage>;
  };
  $transaction: <T>(
    fn: (tx: {
      productImage: {
        update: (args: {
          where: { id: string };
          data: UpdateProductImageData;
        }) => Promise<ProductImage>;
      };
    }) => Promise<T>
  ) => Promise<T>;
}

/**
 * Camada de acesso a dados exclusiva da entidade `ProductImage` (PBI #17 - RF02, RF04, RF12, RNF07).
 * Isola 100% das chamadas ao `PrismaClient` referentes à galeria de fotos dos produtos.
 */
export class ProductImageRepository {
  private readonly db: ProductImagePrismaDelegate;

  constructor(
    dbClient: ProductImagePrismaDelegate = prisma as unknown as ProductImagePrismaDelegate
  ) {
    this.db = dbClient;
  }

  async findByProductId(productId: string): Promise<ProductImage[]> {
    return this.db.productImage.findMany({
      where: { productId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
  }

  async findById(id: string): Promise<ProductImage | null> {
    return this.db.productImage.findUnique({
      where: { id },
    });
  }

  async create(data: CreateProductImageData): Promise<ProductImage> {
    return this.db.productImage.create({
      data,
    });
  }

  async update(id: string, data: UpdateProductImageData): Promise<ProductImage> {
    return this.db.productImage.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<ProductImage> {
    return this.db.productImage.delete({
      where: { id },
    });
  }

  async reorderPositions(
    updates: Array<{ id: string; position: number }>
  ): Promise<ProductImage[]> {
    return this.db.$transaction(async (tx) => {
      const results: ProductImage[] = [];
      for (const item of updates) {
        const updated = await tx.productImage.update({
          where: { id: item.id },
          data: { position: item.position },
        });
        results.push(updated);
      }
      return results;
    });
  }
}
