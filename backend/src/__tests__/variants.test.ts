import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { signJwt } from "../lib/security";
import { app, prisma } from "../server";

describe("Integração HTTP — Variações de Produto (PBI #18 / Task #89)", () => {
  let adminToken: string;
  let adminId: string;
  let productId: string;
  let otherProductId: string;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-menina-mulher";
  });

  beforeEach(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    const admin = await prisma.user.create({
      data: {
        name: "Admin Variações",
        email: "admin.variacoes@meninamulher.com",
        passwordHash: "hash-nao-usado-direto",
        role: "ADMIN",
      },
    });
    adminId = admin.id;

    adminToken = signJwt({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });

    const category = await prisma.category.create({
      data: {
        name: "Conjuntos",
        slug: "conjuntos",
      },
    });

    const product = await prisma.product.create({
      data: {
        name: "Conjunto Alfaiataria Linho",
        description: "Conjunto em linho misto",
        price: "259.90",
        categoryId: category.id,
      },
    });
    productId = product.id;

    const otherProduct = await prisma.product.create({
      data: {
        name: "Blusa Tricot",
        description: "Blusa leve",
        price: "119.90",
        categoryId: category.id,
      },
    });
    otherProductId = otherProduct.id;
  });

  it("Cenário 1: deve criar variação individual ou em lote atômico com size em UPPERCASE, trim em color e listar publicamente", async () => {
    const singleRes = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        size: "  p ",
        color: "  Off White  ",
        stock: 6,
      });

    expect(singleRes.status).toBe(201);
    expect(singleRes.body).toMatchObject({
      productId,
      size: "P",
      color: "Off White",
      stock: 6,
    });

    const batchRes = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        variants: [
          { size: "m", color: "  Preto ", stock: 4 },
          { size: "único", color: "Areia" },
        ],
      });

    expect(batchRes.status).toBe(201);
    expect(Array.isArray(batchRes.body)).toBe(true);
    expect(batchRes.body).toHaveLength(2);
    expect(batchRes.body[0]).toMatchObject({
      size: "M",
      color: "Preto",
      stock: 4,
    });
    expect(batchRes.body[1]).toMatchObject({
      size: "ÚNICO",
      color: "Areia",
      stock: 0,
    });

    const listRes = await request(app).get(`/api/products/${productId}/variants`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(3);
  });

  it("Cenário 2: deve retornar 409 Conflict em duplicidade case-insensitive (individual e lote atômico sem salvar metade)", async () => {
    await prisma.productVariant.create({
      data: {
        productId,
        size: "M",
        color: "Preto",
        stock: 5,
      },
    });

    const dupSingle = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        size: " m ",
        color: " preto ",
        stock: 3,
      });

    expect(dupSingle.status).toBe(409);

    const dupBatch = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        variants: [
          { size: "G", color: "Verde", stock: 8 },
          { size: "m", color: "PRETO", stock: 2 },
        ],
      });

    expect(dupBatch.status).toBe(409);

    const remaining = await prisma.productVariant.findMany({
      where: { productId },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].size).toBe("M");
  });

  it("Cenário 3: deve atualizar stock, size e color via PATCH e rejeitar stock negativo ou colisão de combinação", async () => {
    const v1 = await prisma.productVariant.create({
      data: { productId, size: "P", color: "Preto", stock: 5 },
    });
    const v2 = await prisma.productVariant.create({
      data: { productId, size: "G", color: "Azul", stock: 3 },
    });

    const patchOk = await request(app)
      .patch(`/api/products/${productId}/variants/${v1.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        size: " m ",
        color: "  Preto Fosco ",
        stock: 0,
      });

    expect(patchOk.status).toBe(200);
    expect(patchOk.body).toMatchObject({
      id: v1.id,
      size: "M",
      color: "Preto Fosco",
      stock: 0,
    });

    const patchNegative = await request(app)
      .patch(`/api/products/${productId}/variants/${v1.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ stock: -3 });

    expect(patchNegative.status).toBe(400);

    const patchCollision = await request(app)
      .patch(`/api/products/${productId}/variants/${v2.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ size: "m", color: "preto fosco" });

    expect(patchCollision.status).toBe(409);
  });

  it("Cenário 4: deve excluir variação sem pedidos (200/204), mas retornar 409 ao tentar excluir variação com OrderItem e permitir zerar seu estoque via PATCH", async () => {
    const freeVariant = await prisma.productVariant.create({
      data: { productId, size: "P", color: "Branco", stock: 4 },
    });
    const orderedVariant = await prisma.productVariant.create({
      data: { productId, size: "G", color: "Vinho", stock: 5 },
    });

    const order = await prisma.order.create({
      data: {
        totalAmount: "259.90",
        items: {
          create: [
            {
              variantId: orderedVariant.id,
              quantity: 1,
              unitPrice: "259.90",
            },
          ],
        },
      },
    });
    expect(order.id).toBeDefined();

    const deleteFree = await request(app)
      .delete(`/api/products/${productId}/variants/${freeVariant.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect([200, 204]).toContain(deleteFree.status);

    const deleteOrdered = await request(app)
      .delete(`/api/products/${productId}/variants/${orderedVariant.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(deleteOrdered.status).toBe(409);
    expect(deleteOrdered.body.error || deleteOrdered.body.message).toMatch(/estoque|stock/i);

    const zeroStockRes = await request(app)
      .patch(`/api/products/${productId}/variants/${orderedVariant.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ stock: 0 });

    expect(zeroStockRes.status).toBe(200);
    expect(zeroStockRes.body.stock).toBe(0);
  });

  it("Cenário 5: deve retornar 404 para productId inexistente ou variantId pertencente a outro produto e 401 sem token nas rotas de escrita", async () => {
    const otherVariant = await prisma.productVariant.create({
      data: { productId: otherProductId, size: "U", color: "Nude", stock: 2 },
    });

    const getMissingProd = await request(app).get(
      "/api/products/00000000-0000-0000-0000-000000000000/variants"
    );
    expect(getMissingProd.status).toBe(404);

    const patchWrongOwner = await request(app)
      .patch(`/api/products/${productId}/variants/${otherVariant.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ stock: 10 });
    expect(patchWrongOwner.status).toBe(404);

    const unauthPost = await request(app)
      .post(`/api/products/${productId}/variants`)
      .send({ size: "P", color: "Preto", stock: 2 });
    expect(unauthPost.status).toBe(401);
  });

  describe("Ajuste Manual de Estoque (PBI #19 / Task #175 [red])", () => {
    it("Cenário 6: deve ajustar estoque positivo e zero via PATCH, persistir no banco e emitir log estruturado STOCK_ADJUSTMENT", async () => {
      const variant = await prisma.productVariant.create({
        data: { productId, size: "M", color: "Preto", stock: 5 },
      });

      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

      try {
        const replenishRes = await request(app)
          .patch(`/api/products/${productId}/variants/${variant.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ stock: 12 });

        expect(replenishRes.status).toBe(200);
        expect(replenishRes.body).toMatchObject({
          id: variant.id,
          productId,
          stock: 12,
        });

        const zeroRes = await request(app)
          .patch(`/api/products/${productId}/variants/${variant.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ stock: 0 });

        expect(zeroRes.status).toBe(200);
        expect(zeroRes.body.stock).toBe(0);

        const sameStockRes = await request(app)
          .patch(`/api/products/${productId}/variants/${variant.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ stock: 0 });

        expect(sameStockRes.status).toBe(200);

        const stockLogs = infoSpy.mock.calls
          .map((call) => {
            const firstArg = call[0];
            if (typeof firstArg === "string") {
              try {
                return JSON.parse(firstArg) as Record<string, unknown>;
              } catch {
                return null;
              }
            }
            if (firstArg && typeof firstArg === "object") {
              return firstArg as Record<string, unknown>;
            }
            return null;
          })
          .filter((entry) => entry?.event === "STOCK_ADJUSTMENT");

        expect(stockLogs).toHaveLength(2);
        expect(stockLogs[0]).toMatchObject({
          event: "STOCK_ADJUSTMENT",
          productId,
          variantId: variant.id,
          previousStock: 5,
          newStock: 12,
          delta: 7,
          actorId: adminId,
        });
        expect(stockLogs[1]).toMatchObject({
          event: "STOCK_ADJUSTMENT",
          productId,
          variantId: variant.id,
          previousStock: 12,
          newStock: 0,
          delta: -12,
          actorId: adminId,
        });

        const persisted = await prisma.productVariant.findUnique({
          where: { id: variant.id },
        });
        expect(persisted?.stock).toBe(0);
      } finally {
        infoSpy.mockRestore();
      }
    });

    it("Cenário 7: deve rejeitar stock negativo, decimal, string ou corpo vazio (400) mantendo o saldo intacto e bloquear sem token ADMIN (401)", async () => {
      const variant = await prisma.productVariant.create({
        data: { productId, size: "G", color: "Rubi", stock: 7 },
      });

      const unauthPatch = await request(app)
        .patch(`/api/products/${productId}/variants/${variant.id}`)
        .send({ stock: 10 });
      expect(unauthPatch.status).toBe(401);

      const invalidBodies: Array<Record<string, unknown>> = [
        { stock: -2 },
        { stock: 3.5 },
        { stock: "5" },
        {},
      ];

      for (const body of invalidBodies) {
        const res = await request(app)
          .patch(`/api/products/${productId}/variants/${variant.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(body);

        expect(res.status).toBe(400);
      }

      const persisted = await prisma.productVariant.findUnique({
        where: { id: variant.id },
      });
      expect(persisted?.stock).toBe(7);
    });

    it("Cenário 8: deve retornar 404 para produto/variação inexistente ou de outro produto e garantir CHECK contra saldo negativo no banco (RNF09)", async () => {
      const otherVariant = await prisma.productVariant.create({
        data: { productId: otherProductId, size: "P", color: "Areia", stock: 3 },
      });

      const missingProductRes = await request(app)
        .patch(`/api/products/00000000-0000-0000-0000-000000000000/variants/${otherVariant.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ stock: 9 });
      expect(missingProductRes.status).toBe(404);

      const wrongOwnerRes = await request(app)
        .patch(`/api/products/${productId}/variants/${otherVariant.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ stock: 9 });
      expect(wrongOwnerRes.status).toBe(404);

      await expect(
        prisma.productVariant.update({
          where: { id: otherVariant.id },
          data: { stock: -1 },
        })
      ).rejects.toThrow();
    });
  });
});
