import { OrderStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { signJwt } from "../lib/security";
import { app, prisma } from "../server";
import { truncateAllTables } from "./helpers/test-db";

describe("Integração HTTP — Pedidos Administrativos (PBI #31 / Task #198 [red])", () => {
  let adminToken: string;
  let variantAuroraPId: string;
  let variantPerolaMId: string;
  let pendingOrderId: string;
  let confirmedOrderId: string;
  let cancelledOrderId: string;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-menina-mulher";
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);

    const admin = await prisma.user.create({
      data: {
        name: "Joana Administradora",
        email: "joana.orders@meninamulher.com",
        passwordHash: "hash-admin-orders",
        role: "ADMIN",
      },
    });

    adminToken = signJwt({
      sub: admin.id,
      role: admin.role,
    });

    const category = await prisma.category.create({
      data: {
        name: "Conjuntos",
        slug: "conjuntos",
      },
    });

    const productAurora = await prisma.product.create({
      data: {
        name: "Conjunto Renda Aurora",
        description: "Conjunto autoral em renda",
        price: "89.90",
        categoryId: category.id,
      },
    });

    const productPerola = await prisma.product.create({
      data: {
        name: "Sutiã Renda Pérola",
        description: "Sutiã estruturado",
        price: "59.90",
        categoryId: category.id,
      },
    });

    const variantAuroraP = await prisma.productVariant.create({
      data: {
        productId: productAurora.id,
        size: "P",
        color: "Rubi",
        stock: 8,
      },
    });
    variantAuroraPId = variantAuroraP.id;

    const variantPerolaM = await prisma.productVariant.create({
      data: {
        productId: productPerola.id,
        size: "M",
        color: "Branco",
        stock: 5,
      },
    });
    variantPerolaMId = variantPerolaM.id;

    const cancelledOrder = await prisma.order.create({
      data: {
        status: OrderStatus.CANCELLED,
        totalAmount: "59.90",
        createdAt: new Date("2026-11-14T01:00:00.000Z"),
        items: {
          create: [
            {
              variantId: variantPerolaMId,
              quantity: 1,
              unitPrice: "59.90",
            },
          ],
        },
      },
    });
    cancelledOrderId = cancelledOrder.id;

    const confirmedOrder = await prisma.order.create({
      data: {
        status: OrderStatus.CONFIRMED,
        totalAmount: "89.90",
        createdAt: new Date("2026-11-14T02:00:00.000Z"),
        items: {
          create: [
            {
              variantId: variantAuroraPId,
              quantity: 1,
              unitPrice: "89.90",
            },
          ],
        },
      },
    });
    confirmedOrderId = confirmedOrder.id;

    const pendingOrder = await prisma.order.create({
      data: {
        status: OrderStatus.PENDING,
        totalAmount: "149.80",
        createdAt: new Date("2026-11-14T03:00:00.000Z"),
        items: {
          create: [
            {
              variantId: variantAuroraPId,
              quantity: 1,
              unitPrice: "89.90",
            },
            {
              variantId: variantPerolaMId,
              quantity: 1,
              unitPrice: "59.90",
            },
          ],
        },
      },
    });
    pendingOrderId = pendingOrder.id;
  });

  afterAll(async () => {
    await truncateAllTables(prisma);
    await prisma.$disconnect();
  });

  it("Cenário 1: deve exigir autenticação ADMIN (401 Unauthorized sem token ou token inválido) em todas as rotas de /api/admin/orders", async () => {
    const getListNoToken = await request(app).get("/api/admin/orders");
    expect(getListNoToken.status).toBe(401);

    const getByIdInvalidToken = await request(app)
      .get(`/api/admin/orders/${pendingOrderId}`)
      .set("Authorization", "Bearer token-invalido");
    expect(getByIdInvalidToken.status).toBe(401);

    const confirmNoToken = await request(app).patch(`/api/admin/orders/${pendingOrderId}/confirm`);
    expect(confirmNoToken.status).toBe(401);

    const cancelNoToken = await request(app).patch(`/api/admin/orders/${pendingOrderId}/cancel`);
    expect(cancelNoToken.status).toBe(401);
  });

  it("Cenário 2: GET /api/admin/orders deve listar pedidos ordenados por createdAt desc com itens achatados, suportar filtro status e paginação, e não expor dados pessoais (RNF06)", async () => {
    const listRes = await request(app)
      .get("/api/admin/orders?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 3,
      totalPages: 1,
    });
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data).toHaveLength(3);

    // Ordenação decrescente por createdAt: pending -> confirmed -> cancelled
    expect(listRes.body.data.map((o: { id: string }) => o.id)).toEqual([
      pendingOrderId,
      confirmedOrderId,
      cancelledOrderId,
    ]);

    const firstOrder = listRes.body.data[0];
    expect(firstOrder).toMatchObject({
      id: pendingOrderId,
      status: "PENDING",
    });
    expect(typeof firstOrder.orderNumber).toBe("number");
    expect(firstOrder).not.toHaveProperty("customerName");
    expect(firstOrder).not.toHaveProperty("customerPhone");
    expect(firstOrder).not.toHaveProperty("customerEmail");

    expect(firstOrder.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variantId: variantAuroraPId,
          quantity: 1,
          size: "P",
          color: "Rubi",
          productName: "Conjunto Renda Aurora",
        }),
        expect.objectContaining({
          variantId: variantPerolaMId,
          quantity: 1,
          size: "M",
          color: "Branco",
          productName: "Sutiã Renda Pérola",
        }),
      ])
    );

    // Filtro por status=PENDING
    const filteredRes = await request(app)
      .get("/api/admin/orders?status=PENDING")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(filteredRes.status).toBe(200);
    expect(filteredRes.body.data).toHaveLength(1);
    expect(filteredRes.body.data[0].id).toBe(pendingOrderId);
    expect(filteredRes.body.meta.total).toBe(1);

    // Paginação page=1&limit=2
    const pagedRes = await request(app)
      .get("/api/admin/orders?page=1&limit=2")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(pagedRes.status).toBe(200);
    expect(pagedRes.body.data).toHaveLength(2);
    expect(pagedRes.body.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    // Status inválido ou paginação inválida -> 400 Bad Request
    const invalidStatusRes = await request(app)
      .get("/api/admin/orders?status=INVALIDO")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(invalidStatusRes.status).toBe(400);

    const invalidPageRes = await request(app)
      .get("/api/admin/orders?page=0&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(invalidPageRes.status).toBe(400);
  });

  it("Cenário 3: GET /api/admin/orders/:id deve retornar 200 OK com os detalhes do pedido e seus itens ou 404 Not Found se não existir", async () => {
    const detailRes = await request(app)
      .get(`/api/admin/orders/${pendingOrderId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body).toMatchObject({
      id: pendingOrderId,
      status: "PENDING",
    });
    expect(detailRes.body.items).toHaveLength(2);
    expect(detailRes.body.items[0]).toEqual(
      expect.objectContaining({
        variantId: expect.any(String),
        quantity: 1,
        unitPrice: expect.anything(),
        size: expect.any(String),
        color: expect.any(String),
        productName: expect.any(String),
      })
    );

    const notFoundRes = await request(app)
      .get("/api/admin/orders/00000000-0000-4000-9000-999999999999")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(notFoundRes.status).toBe(404);
  });

  it("Cenário 4: PATCH /api/admin/orders/:id/confirm deve atualizar PENDING -> CONFIRMED (200 OK) e retornar 404 para inexistente ou 409 para pedido já finalizado", async () => {
    const confirmRes = await request(app)
      .patch(`/api/admin/orders/${pendingOrderId}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body).toMatchObject({
      id: pendingOrderId,
      status: "CONFIRMED",
    });

    const persisted = await prisma.order.findUnique({ where: { id: pendingOrderId } });
    expect(persisted?.status).toBe(OrderStatus.CONFIRMED);

    // Tentar confirmar novamente deve retornar 409 Conflict
    const confirmAgainRes = await request(app)
      .patch(`/api/admin/orders/${pendingOrderId}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(confirmAgainRes.status).toBe(409);

    // Tentar confirmar um pedido CANCELLED deve retornar 409 Conflict
    const confirmCancelledRes = await request(app)
      .patch(`/api/admin/orders/${cancelledOrderId}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(confirmCancelledRes.status).toBe(409);

    // Pedido inexistente -> 404 Not Found
    const confirmMissingRes = await request(app)
      .patch("/api/admin/orders/00000000-0000-4000-9000-999999999999/confirm")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(confirmMissingRes.status).toBe(404);
  });

  it("Cenário 5: PATCH /api/admin/orders/:id/cancel deve atualizar PENDING -> CANCELLED (200 OK) e retornar 404 para inexistente ou 409 para pedido já finalizado", async () => {
    const cancelRes = await request(app)
      .patch(`/api/admin/orders/${pendingOrderId}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body).toMatchObject({
      id: pendingOrderId,
      status: "CANCELLED",
    });

    const persisted = await prisma.order.findUnique({ where: { id: pendingOrderId } });
    expect(persisted?.status).toBe(OrderStatus.CANCELLED);

    // Tentar cancelar novamente deve retornar 409 Conflict
    const cancelAgainRes = await request(app)
      .patch(`/api/admin/orders/${pendingOrderId}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(cancelAgainRes.status).toBe(409);

    // Tentar cancelar um pedido CONFIRMED deve retornar 409 Conflict
    const cancelConfirmedRes = await request(app)
      .patch(`/api/admin/orders/${confirmedOrderId}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(cancelConfirmedRes.status).toBe(409);

    // Pedido inexistente -> 404 Not Found
    const cancelMissingRes = await request(app)
      .patch("/api/admin/orders/00000000-0000-4000-9000-999999999999/cancel")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(cancelMissingRes.status).toBe(404);
  });
});
