import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed";
import { prisma } from "../lib/prisma";
import { app } from "../server";
import { truncateAllTables } from "./helpers/test-db";

async function loginAsAdmin(): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({
    email: "joana@meninamulher.com",
    password: "MeninaMulher@2026",
  });
  return res.body.token as string;
}

describe("Integração HTTP — Gerenciamento de Produtos e Categorias (PBI #16 / Task #93)", () => {
  beforeEach(async () => {
    await truncateAllTables(prisma);
    await seedDatabase(prisma);
  });

  afterAll(async () => {
    await truncateAllTables(prisma);
    await prisma.$disconnect();
  });

  describe("GET /api/categories (Público)", () => {
    it("deve retornar 200 OK com a lista de categorias ordenadas para navegação e select do painel", async () => {
      const response = await request(app).get("/api/categories");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(4);
      expect(response.body[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          slug: expect.any(String),
        })
      );
    });
  });

  describe("GET /api/products e GET /api/products/:id (Vitrine Pública — RF01, RF02, RF03, US11)", () => {
    it("deve retornar 200 OK listando apenas produtos ativos (active: true) e suportar filtros featured e category", async () => {
      const response = await request(app).get("/api/products");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // No seed há 4 produtos (3 ativos e 1 oculto)
      expect(response.body).toHaveLength(3);
      expect(response.body.every((p: { active: boolean }) => p.active === true)).toBe(true);

      const featuredRes = await request(app).get("/api/products?featured=true");
      expect(featuredRes.status).toBe(200);
      expect(featuredRes.body).toHaveLength(2);
      expect(featuredRes.body.every((p: { featured: boolean }) => p.featured === true)).toBe(true);

      const bySlugRes = await request(app).get("/api/products?category=conjuntos");
      expect(bySlugRes.status).toBe(200);
      expect(bySlugRes.body).toHaveLength(1);
      expect(bySlugRes.body[0].name).toBe("Conjunto Renda Aurora");
    });

    it("GET /api/products/:id deve retornar 200 OK para produto ativo e 404 Not Found para produto oculto ou inexistente", async () => {
      const activeId = "00000000-0000-4000-8000-000000000001";
      const hiddenId = "00000000-0000-4000-8000-000000000004";

      const okRes = await request(app).get(`/api/products/${activeId}`);
      expect(okRes.status).toBe(200);
      expect(okRes.body.name).toBe("Conjunto Renda Aurora");

      const hiddenRes = await request(app).get(`/api/products/${hiddenId}`);
      expect(hiddenRes.status).toBe(404);

      const notFoundRes = await request(app).get(
        "/api/products/00000000-0000-4000-8000-999999999999"
      );
      expect(notFoundRes.status).toBe(404);
    });
  });

  describe("GET /api/admin/products e GET /api/admin/products/:id (Painel Administrativo — RF11, RF12)", () => {
    it("deve exigir autenticação ADMIN (401 sem token) e listar todos os produtos (ativos e ocultos) quando autenticado", async () => {
      const unauthRes = await request(app).get("/api/admin/products");
      expect(unauthRes.status).toBe(401);

      const token = await loginAsAdmin();
      const adminListRes = await request(app)
        .get("/api/admin/products")
        .set("Authorization", `Bearer ${token}`);

      expect(adminListRes.status).toBe(200);
      expect(adminListRes.body).toHaveLength(4);

      const hiddenId = "00000000-0000-4000-8000-000000000004";
      const adminDetailRes = await request(app)
        .get(`/api/admin/products/${hiddenId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(adminDetailRes.status).toBe(200);
      expect(adminDetailRes.body.active).toBe(false);
    });
  });

  describe("POST /api/products (Cadastro de Produto — RF11, RF12, RNF09)", () => {
    it("deve retornar 401 sem token ADMIN, criar produto com 201 Created e rejeitar 400/404 para dados inválidos", async () => {
      const unauthRes = await request(app)
        .post("/api/products")
        .send({ name: "Novo Produto", price: 79.9 });
      expect(unauthRes.status).toBe(401);

      const token = await loginAsAdmin();
      const category = await prisma.category.findUniqueOrThrow({ where: { slug: "conjuntos" } });

      const createRes = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "  Conjunto Renda Rubi  ",
          description: "  Peça exclusiva de renda  ",
          price: 119.9,
          categoryId: category.id,
          featured: true,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toMatchObject({
        name: "Conjunto Renda Rubi",
        description: "Peça exclusiva de renda",
        active: true,
        featured: true,
        categoryId: category.id,
      });
      expect(Number(createRes.body.price)).toBeCloseTo(119.9, 2);

      const badNameRes = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "   ", price: 50 });
      expect(badNameRes.status).toBe(400);

      const negativePriceRes = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Produto Preço Negativo", price: -5 });
      expect(negativePriceRes.status).toBe(400);

      const unknownCategoryRes = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Produto Categoria Inexistente",
          price: 50,
          categoryId: "00000000-0000-4000-8000-999999999999",
        });
      expect(unknownCategoryRes.status).toBe(404);
    });
  });

  describe("PATCH /api/products/:id (Edição e Ocultação/Reativação — RF12, US11)", () => {
    it("deve editar dados do produto, permitir ocultar (active: false) e reexibir (active: true), e retornar 404 se inexistente", async () => {
      const token = await loginAsAdmin();
      const productId = "00000000-0000-4000-8000-000000000003"; // Baby Doll Cetim Noite (ativo)

      const hideRes = await request(app)
        .patch(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ active: false, price: 69.9 });

      expect(hideRes.status).toBe(200);
      expect(hideRes.body.active).toBe(false);
      expect(Number(hideRes.body.price)).toBeCloseTo(69.9, 2);

      // Produto oculto não deve aparecer na rota pública
      const publicGetHidden = await request(app).get(`/api/products/${productId}`);
      expect(publicGetHidden.status).toBe(404);

      // Reativar produto
      const showRes = await request(app)
        .patch(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ active: true });
      expect(showRes.status).toBe(200);
      expect(showRes.body.active).toBe(true);

      const notFoundRes = await request(app)
        .patch("/api/products/00000000-0000-4000-8000-999999999999")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Inexistente" });
      expect(notFoundRes.status).toBe(404);
    });
  });

  describe("DELETE /api/products/:id (Exclusão Física vs Proteção de Histórico de Pedidos — RNF09)", () => {
    it("deve excluir fisicamente produto sem pedidos vinculados e retornar 409 Conflict amigável quando houver OrderItem vinculado", async () => {
      const token = await loginAsAdmin();

      // Produto #3 (Baby Doll Cetim Noite) NÃO possui pedidos no seed -> pode ser excluído
      const productWithoutOrders = "00000000-0000-4000-8000-000000000003";
      const deleteOkRes = await request(app)
        .delete(`/api/products/${productWithoutOrders}`)
        .set("Authorization", `Bearer ${token}`);
      expect([200, 204]).toContain(deleteOkRes.status);

      const verifyDeleted = await prisma.product.findUnique({
        where: { id: productWithoutOrders },
      });
      expect(verifyDeleted).toBeNull();

      // Produto #1 (Conjunto Renda Aurora) POSSUI pedidos vinculados no seed -> deve retornar 409 Conflict
      const productWithOrders = "00000000-0000-4000-8000-000000000001";
      const deleteConflictRes = await request(app)
        .delete(`/api/products/${productWithOrders}`)
        .set("Authorization", `Bearer ${token}`);

      expect(deleteConflictRes.status).toBe(409);
      expect(deleteConflictRes.body.error).toMatch(/ocult/i);
    });
  });

  describe("Disponibilidade nas rotas de Produto (PBI #21 / Task #191 [red])", () => {
    it("GET /api/products e GET /api/products/:id devem incluir availabilityStatus, availabilityLabel e available em cada variação", async () => {
      const listRes = await request(app).get("/api/products");
      expect(listRes.status).toBe(200);

      const allVariants = (
        listRes.body as Array<{ variants: Array<Record<string, unknown>> }>
      ).flatMap((p) => p.variants ?? []);
      expect(allVariants.length).toBeGreaterThan(0);

      for (const variant of allVariants) {
        expect(variant).toEqual(
          expect.objectContaining({
            availabilityStatus: expect.stringMatching(/^(OUT_OF_STOCK|LOW_STOCK|AVAILABLE)$/),
            availabilityLabel: expect.stringMatching(/^(esgotado|últimas unidades|disponível)$/),
            available: expect.any(Boolean),
          })
        );
      }

      const activeId = "00000000-0000-4000-8000-000000000001";
      const detailRes = await request(app).get(`/api/products/${activeId}`);
      expect(detailRes.status).toBe(200);
      expect(Array.isArray(detailRes.body.variants)).toBe(true);
      expect(detailRes.body.variants.length).toBeGreaterThan(0);

      for (const variant of detailRes.body.variants as Array<{
        stock: number;
        availabilityStatus: string;
        availabilityLabel: string;
        available: boolean;
      }>) {
        if (variant.stock === 0) {
          expect(variant.availabilityStatus).toBe("OUT_OF_STOCK");
          expect(variant.availabilityLabel).toBe("esgotado");
          expect(variant.available).toBe(false);
        } else if (variant.stock <= 3) {
          expect(variant.availabilityStatus).toBe("LOW_STOCK");
          expect(variant.availabilityLabel).toBe("últimas unidades");
          expect(variant.available).toBe(true);
        } else {
          expect(variant.availabilityStatus).toBe("AVAILABLE");
          expect(variant.availabilityLabel).toBe("disponível");
          expect(variant.available).toBe(true);
        }
      }
    });
  });
});
