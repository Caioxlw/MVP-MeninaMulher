import { PrismaClient, User } from "@prisma/client";
import { prisma as defaultPrisma } from "../lib/prisma";

/**
 * Camada de acesso a dados exclusiva da entidade `User`.
 * Isola 100% das chamadas ao `PrismaClient` referentes à autenticação.
 */
export class UserRepository {
  private readonly db: PrismaClient;

  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.db = prismaClient;
  }

  async findByEmailInsensitive(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return this.db.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { id },
    });
  }
}
