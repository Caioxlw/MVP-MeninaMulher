import type { ProductVariant } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface CreateVariantData {
  productId: string;
  size: string;
  color: string;
  stock: number;
}

export interface UpdateVariantData {
  size?: string;
  color?: string;
  stock?: number;
}

export interface VariantPrismaDelegate {
  productVariant: {
    findMany: (args: {
      where: { productId: string };
      orderBy?: Array<Record<string, "asc" | "desc">>;
    }) => Promise<ProductVariant[]>;
    findUnique: (args: { where: { id: string } }) => Promise<ProductVariant | null>;
    findFirst: (args: {
      where: {
        productId: string;
        size: { equals: string; mode: "insensitive" };
        color: { equals: string; mode: "insensitive" };
        id?: { not: string };
      };
    }) => Promise<ProductVariant | null>;
    create: (args: { data: CreateVariantData }) => Promise<ProductVariant>;
    update: (args: { where: { id: string }; data: UpdateVariantData }) => Promise<ProductVariant>;
    delete: (args: { where: { id: string } }) => Promise<ProductVariant>;
  };
  orderItem: {
    count: (args: { where: { variantId: string } }) => Promise<number>;
  };
  $transaction: <T>(
    fn: (tx: {
      productVariant: {
        create: (args: { data: CreateVariantData }) => Promise<ProductVariant>;
      };
    }) => Promise<T>
  ) => Promise<T>;
}

export class VariantRepository {
  private readonly db: VariantPrismaDelegate;

  constructor(dbClient: VariantPrismaDelegate = prisma as unknown as VariantPrismaDelegate) {
    this.db = dbClient;
  }

  async findByProductId(productId: string): Promise<ProductVariant[]> {
    return this.db.productVariant.findMany({
      where: { productId },
      orderBy: [{ size: "asc" }, { color: "asc" }],
    });
  }

  async findById(id: string): Promise<ProductVariant | null> {
    return this.db.productVariant.findUnique({
      where: { id },
    });
  }

  async findByProductSizeColorInsensitive(
    productId: string,
    size: string,
    color: string,
    excludeVariantId?: string
  ): Promise<ProductVariant | null> {
    return this.db.productVariant.findFirst({
      where: {
        productId,
        size: { equals: size, mode: "insensitive" },
        color: { equals: color, mode: "insensitive" },
        ...(excludeVariantId ? { id: { not: excludeVariantId } } : {}),
      },
    });
  }

  async create(data: CreateVariantData): Promise<ProductVariant> {
    return this.db.productVariant.create({ data });
  }

  async createManyAtomic(items: CreateVariantData[]): Promise<ProductVariant[]> {
    return this.db.$transaction(async (tx) => {
      const created: ProductVariant[] = [];
      for (const item of items) {
        const record = await tx.productVariant.create({ data: item });
        created.push(record);
      }
      return created;
    });
  }

  async update(id: string, data: UpdateVariantData): Promise<ProductVariant> {
    return this.db.productVariant.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<ProductVariant> {
    return this.db.productVariant.delete({
      where: { id },
    });
  }

  async hasOrderItems(variantId: string): Promise<boolean> {
    const count = await this.db.orderItem.count({
      where: { variantId },
    });
    return count > 0;
  }
}
