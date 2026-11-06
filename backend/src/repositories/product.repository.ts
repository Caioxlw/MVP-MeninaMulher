import { Prisma, PrismaClient, Product } from "@prisma/client";
import { prisma as defaultPrisma } from "../lib/prisma";

export interface PublicProductFilters {
  featured?: boolean;
  categoryId?: string;
  categorySlug?: string;
}

export interface CreateProductData {
  name: string;
  description: string | null;
  price: number | string;
  active: boolean;
  featured: boolean;
  categoryId: string | null;
}

export type UpdateProductData = Partial<CreateProductData>;

/**
 * Camada de acesso a dados exclusiva da entidade `Product` (RF01, RF02, RF03, RF12, US01, US11).
 * Isola 100% das chamadas ao `PrismaClient` referentes a produtos.
 */
export class ProductRepository {
  private readonly db: PrismaClient;

  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.db = prismaClient;
  }

  async findPublicActive(filters?: PublicProductFilters): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = {
      active: true,
    };

    if (typeof filters?.featured === "boolean") {
      where.featured = filters.featured;
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.categorySlug) {
      where.category = { slug: filters.categorySlug };
    }

    return this.db.product.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllAdmin(): Promise<Product[]> {
    return this.db.product.findMany({
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findPublicById(id: string): Promise<Product | null> {
    return this.db.product.findFirst({
      where: { id, active: true },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
      },
    });
  }

  async findAdminById(id: string): Promise<Product | null> {
    return this.db.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
      },
    });
  }

  async create(data: CreateProductData): Promise<Product> {
    return this.db.product.create({
      data,
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
      },
    });
  }

  async update(id: string, data: UpdateProductData): Promise<Product> {
    return this.db.product.update({
      where: { id },
      data,
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
      },
    });
  }

  async delete(id: string): Promise<Product> {
    return this.db.product.delete({
      where: { id },
    });
  }

  async hasOrderItems(productId: string): Promise<boolean> {
    const count = await this.db.orderItem.count({
      where: {
        variant: {
          productId,
        },
      },
    });
    return count > 0;
  }
}
