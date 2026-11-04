import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed";
import { prisma } from "../lib/prisma";
import { truncateAllTables } from "./helpers/test-db";

describe("Script de Seed do Banco de Dados (Task #71)", () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await truncateAllTables();
    await prisma.$disconnect();
  });

  it("deve popular o banco de forma idempotente cobrindo todos os estados de estoque e pedido", async () => {
    await seedDatabase(prisma);
    // Executa uma segunda vez para comprovar idempotência (sem duplicar registros)
    await seedDatabase(prisma);

    const users = await prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("joana@meninamulher.com");
    expect(users[0].role).toBe("ADMIN");

    const categories = await prisma.category.findMany();
    expect(categories).toHaveLength(4);

    const products = await prisma.product.findMany({
      include: { images: true, variants: true },
    });
    expect(products).toHaveLength(4);
    expect(products.filter((p) => p.active)).toHaveLength(3);
    expect(products.filter((p) => !p.active)).toHaveLength(1);
    expect(products.filter((p) => p.featured)).toHaveLength(2);

    const variants = await prisma.productVariant.findMany();
    // Verifica presença dos 3 estados de disponibilidade: disponível (> 2), últimas unidades (1..2) e esgotado (0)
    expect(variants.some((v) => v.stock > 2)).toBe(true);
    expect(variants.some((v) => v.stock >= 1 && v.stock <= 2)).toBe(true);
    expect(variants.some((v) => v.stock === 0)).toBe(true);

    const orders = await prisma.order.findMany({ include: { items: true } });
    expect(orders).toHaveLength(3);
    expect(orders.map((o) => o.status).sort()).toEqual(["CANCELLED", "CONFIRMED", "PENDING"]);
  });
});
