import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { truncateAllTables } from "./helpers/test-db";

// Acesso dinâmico ao cliente Prisma para permitir que a suíte de testes
// seja escrita na etapa [red] do TDD antes da geração dos modelos na Task #70.
const db = prisma as Record<string, any>;

describe("Modelagem do Banco Relacional — Integridade, Constraints e Concorrência (PBI #12)", () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await truncateAllTables();
    await prisma.$disconnect();
  });

  describe("1. User & Role (RF11, RNF05)", () => {
    it("deve criar a usuária administradora (ADMIN) com passwordHash e rejeitar e-mail duplicado", async () => {
      expect(db.systemStatus).toBeUndefined();

      const admin = await db.user.create({
        data: {
          name: "Joana Santos",
          email: "joana@meninamulher.com",
          passwordHash: "$2b$10$hashedPasswordExample1234567890",
        },
      });

      expect(admin.id).toBeDefined();
      expect(admin.role).toBe("ADMIN");
      expect(admin.active).toBe(true);
      expect(admin.passwordHash).toBe("$2b$10$hashedPasswordExample1234567890");

      await expect(
        db.user.create({
          data: {
            name: "Outra Joana",
            email: "joana@meninamulher.com",
            passwordHash: "$2b$10$otherHash",
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("2. Category & Product (RF01, RF02, RF03, RF12, US01, US02, US07, US11)", () => {
    it("deve criar categoria com slug único e associar produtos com precisão Decimal(10, 2)", async () => {
      const category = await db.category.create({
        data: {
          name: "Conjuntos de Renda",
          slug: "conjuntos-de-renda",
        },
      });

      await expect(
        db.category.create({
          data: {
            name: "Conjuntos Duplicados",
            slug: "conjuntos-de-renda",
          },
        })
      ).rejects.toThrow();

      const product = await db.product.create({
        data: {
          name: "Conjunto Aurora",
          description: "Conjunto em renda floral com aro e bojo macio",
          price: "89.90",
          categoryId: category.id,
        },
      });

      expect(product.id).toBeDefined();
      expect(product.price.toString()).toBe("89.9");
      expect(Number(product.price)).toBeCloseTo(89.9, 2);
      expect(product.active).toBe(true);
      expect(product.featured).toBe(false);
      expect(product.categoryId).toBe(category.id);
    });

    it("deve manter o produto com categoryId nulo caso a categoria seja removida (onDelete: SetNull)", async () => {
      const category = await db.category.create({
        data: {
          name: "Pijamas",
          slug: "pijamas",
        },
      });

      const product = await db.product.create({
        data: {
          name: "Baby Doll Cetim",
          price: "69.50",
          featured: true,
          categoryId: category.id,
        },
      });

      await db.category.delete({ where: { id: category.id } });

      const reloadedProduct = await db.product.findUnique({
        where: { id: product.id },
      });

      expect(reloadedProduct).not.toBeNull();
      expect(reloadedProduct.categoryId).toBeNull();
      expect(reloadedProduct.featured).toBe(true);
    });
  });

  describe("3. ProductImage & ProductVariant (RF04, RF05, RF12, RF13, RNF07)", () => {
    it("deve ordenar fotos por position e exigir combinação única [productId, size, color] nas variações", async () => {
      const product = await db.product.create({
        data: {
          name: "Sutiã Rendado Rubi",
          price: "54.90",
        },
      });

      await db.productImage.createMany({
        data: [
          {
            productId: product.id,
            url: "https://cdn.meninamulher.com/rubi-costas.webp",
            altText: "Costas do Sutiã Rendado Rubi",
            position: 1,
          },
          {
            productId: product.id,
            url: "https://cdn.meninamulher.com/rubi-frente.webp",
            altText: "Frente do Sutiã Rendado Rubi",
            position: 0,
          },
        ],
      });

      const images = await db.productImage.findMany({
        where: { productId: product.id },
        orderBy: { position: "asc" },
      });

      expect(images).toHaveLength(2);
      expect(images[0].position).toBe(0);
      expect(images[0].altText).toBe("Frente do Sutiã Rendado Rubi");
      expect(images[1].position).toBe(1);

      const variantM = await db.productVariant.create({
        data: {
          productId: product.id,
          size: "M",
          color: "Vermelho Rubi",
          stock: 5,
        },
      });
      expect(variantM.stock).toBe(5);

      // Mesma cor mas tamanho diferente: permitido
      const variantG = await db.productVariant.create({
        data: {
          productId: product.id,
          size: "G",
          color: "Vermelho Rubi",
        },
      });
      expect(variantG.stock).toBe(0);

      // Mesmo produto + tamanho + cor: deve ser bloqueado por @@unique([productId, size, color])
      await expect(
        db.productVariant.create({
          data: {
            productId: product.id,
            size: "M",
            color: "Vermelho Rubi",
            stock: 10,
          },
        })
      ).rejects.toThrow();
    });

    it("deve deletar imagens e variações em cascata ao remover o produto (onDelete: Cascade)", async () => {
      const product = await db.product.create({
        data: {
          name: "Calcinha Fio Dental",
          price: "29.90",
          images: {
            create: [{ url: "https://cdn.meninamulher.com/calcinha.webp", position: 0 }],
          },
          variants: {
            create: [{ size: "P", color: "Preto", stock: 3 }],
          },
        },
      });

      await db.product.delete({ where: { id: product.id } });

      const imagesCount = await db.productImage.count({ where: { productId: product.id } });
      const variantsCount = await db.productVariant.count({ where: { productId: product.id } });

      expect(imagesCount).toBe(0);
      expect(variantsCount).toBe(0);
    });
  });

  describe("4. Order & OrderItem — Histórico, Privacidade e Integridade (RF08, RF14, RF15, RNF06)", () => {
    it("deve gerar orderNumber sequencial, status PENDING, preservar unitPrice e não conter dados pessoais de clientes", async () => {
      const product = await db.product.create({
        data: {
          name: "Conjunto Pérola",
          price: "110.00",
          variants: {
            create: [{ size: "M", color: "Branco", stock: 4 }],
          },
        },
        include: { variants: true },
      });

      const variant = product.variants[0];

      const order1 = await db.order.create({
        data: {
          totalAmount: "220.00",
          items: {
            create: [
              {
                variantId: variant.id,
                quantity: 2,
                unitPrice: "110.00",
              },
            ],
          },
        },
        include: { items: true },
      });

      const order2 = await db.order.create({
        data: {
          totalAmount: "110.00",
        },
      });

      expect(order1.orderNumber).toBeGreaterThan(0);
      expect(order2.orderNumber).toBe(order1.orderNumber + 1);
      expect(order1.status).toBe("PENDING");

      // RNF06 (Privacidade): garante que não existem colunas de dados pessoais no objeto Order
      expect("customerName" in order1).toBe(false);
      expect("customerPhone" in order1).toBe(false);
      expect("customerEmail" in order1).toBe(false);
      expect("cpf" in order1).toBe(false);

      // Se o produto mudar de preço ou for ocultado depois, o pedido antigo mantém o unitPrice congelado
      await db.product.update({
        where: { id: product.id },
        data: { price: "149.90", active: false },
      });

      const savedOrderItem = await db.orderItem.findFirst({
        where: { orderId: order1.id },
      });
      expect(Number(savedOrderItem.unitPrice)).toBeCloseTo(110.0, 2);

      // onDelete: Restrict na variante — não pode excluir variante que já está em um pedido
      await expect(db.productVariant.delete({ where: { id: variant.id } })).rejects.toThrow();

      // onDelete: Cascade no pedido — excluir o pedido remove seus OrderItems
      await db.order.delete({ where: { id: order1.id } });
      const itemsAfterDelete = await db.orderItem.count({ where: { orderId: order1.id } });
      expect(itemsAfterDelete).toBe(0);
    });
  });

  describe("5. Defesa em Profundidade — CHECK Constraints no PostgreSQL (RNF09)", () => {
    it("deve rejeitar estoque negativo, quantidade <= 0 e valores monetários negativos diretamente no banco", async () => {
      // Preço negativo em Product deve ser rejeitado pelo CHECK (price >= 0)
      await expect(
        db.product.create({
          data: {
            name: "Produto Preço Inválido",
            price: "-10.00",
          },
        })
      ).rejects.toThrow();

      const product = await db.product.create({
        data: {
          name: "Body Renda",
          price: "99.90",
        },
      });

      // Estoque negativo em ProductVariant deve ser rejeitado pelo CHECK (stock >= 0)
      await expect(
        db.productVariant.create({
          data: {
            productId: product.id,
            size: "M",
            color: "Preto",
            stock: -1,
          },
        })
      ).rejects.toThrow();

      const variant = await db.productVariant.create({
        data: {
          productId: product.id,
          size: "M",
          color: "Preto",
          stock: 5,
        },
      });

      // Total negativo em Order deve ser rejeitado pelo CHECK (totalAmount >= 0)
      await expect(
        db.order.create({
          data: {
            totalAmount: "-50.00",
          },
        })
      ).rejects.toThrow();

      const order = await db.order.create({
        data: {
          totalAmount: "99.90",
        },
      });

      // Quantidade zero ou negativa em OrderItem deve ser rejeitada pelo CHECK (quantity > 0)
      await expect(
        db.orderItem.create({
          data: {
            orderId: order.id,
            variantId: variant.id,
            quantity: 0,
            unitPrice: "99.90",
          },
        })
      ).rejects.toThrow();

      // Preço unitário negativo em OrderItem deve ser rejeitado pelo CHECK (unitPrice >= 0)
      await expect(
        db.orderItem.create({
          data: {
            orderId: order.id,
            variantId: variant.id,
            quantity: 1,
            unitPrice: "-5.00",
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("6. Concorrência na Baixa de Estoque (RNF09)", () => {
    it("deve impedir saldo negativo quando múltiplas baixas simultâneas disputam as últimas unidades", async () => {
      const product = await db.product.create({
        data: {
          name: "Conjunto Edição Limitada",
          price: "129.90",
        },
      });

      const variant = await db.productVariant.create({
        data: {
          productId: product.id,
          size: "P",
          color: "Marsala",
          stock: 2,
        },
      });

      // Dispara 5 decrementos concorrentes de 1 unidade para um estoque de apenas 2 unidades
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          db.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: 1 } },
          })
        )
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(2);
      expect(rejected).toHaveLength(3);

      const finalVariant = await db.productVariant.findUnique({
        where: { id: variant.id },
      });
      expect(finalVariant.stock).toBe(0);
    });
  });
});
