import { Category, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../lib/prisma";

/**
 * Camada de acesso a dados exclusiva da entidade `Category` (RF03, US02).
 * Isola 100% das chamadas ao `PrismaClient` referentes a categorias.
 */
export class CategoryRepository {
  private readonly db: PrismaClient;

  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.db = prismaClient;
  }

  async findAll(): Promise<Category[]> {
    return this.db.category.findMany({
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.db.category.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.db.category.findUnique({
      where: { slug },
    });
  }
}
