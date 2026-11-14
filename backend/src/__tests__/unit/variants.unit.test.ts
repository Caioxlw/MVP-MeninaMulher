import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

interface VariantRecord {
  id: string;
  productId: string;
  size: string;
  color: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

interface VariantRepositoryModule {
  VariantRepository: new (dbClient?: unknown) => {
    findByProductId: (productId: string) => Promise<VariantRecord[]>;
    findById: (id: string) => Promise<VariantRecord | null>;
    findByProductSizeColorInsensitive: (
      productId: string,
      size: string,
      color: string,
      excludeVariantId?: string
    ) => Promise<VariantRecord | null>;
    create: (data: {
      productId: string;
      size: string;
      color: string;
      stock: number;
    }) => Promise<VariantRecord>;
    createManyAtomic: (
      items: Array<{
        productId: string;
        size: string;
        color: string;
        stock: number;
      }>
    ) => Promise<VariantRecord[]>;
    update: (
      id: string,
      data: {
        size?: string;
        color?: string;
        stock?: number;
      }
    ) => Promise<VariantRecord>;
    delete: (id: string) => Promise<VariantRecord>;
    hasOrderItems: (variantId: string) => Promise<boolean>;
  };
}

interface StockAdjustmentLogEntry {
  event: "STOCK_ADJUSTMENT";
  productId: string;
  variantId: string;
  previousStock: number;
  newStock: number;
  delta: number;
  actorId?: string;
  timestamp: string;
}

interface VariantServiceModule {
  VariantError: new (
    message: string,
    statusCode?: number
  ) => Error & {
    statusCode: number;
  };
  VariantService: new (
    variantRepo?: unknown,
    productRepo?: unknown,
    stockLogger?: (entry: StockAdjustmentLogEntry) => void
  ) => {
    listByProduct: (productId: string) => Promise<VariantRecord[]>;
    createVariants: (
      productId: string,
      input:
        | { size?: unknown; color?: unknown; stock?: unknown }
        | {
            variants?: Array<{
              size?: unknown;
              color?: unknown;
              stock?: unknown;
            }>;
          }
    ) => Promise<VariantRecord | VariantRecord[]>;
    updateVariant: (
      productId: string,
      variantId: string,
      input: {
        size?: unknown;
        color?: unknown;
        stock?: unknown;
      },
      actorId?: string
    ) => Promise<VariantRecord>;
    deleteVariant: (productId: string, variantId: string) => Promise<void>;
  };
}

interface VariantControllerModule {
  VariantController: new (variantService?: unknown) => {
    listByProduct: (req: Request, res: Response) => Promise<void>;
    create: (req: Request, res: Response) => Promise<void>;
    update: (req: Request, res: Response) => Promise<void>;
    remove: (req: Request, res: Response) => Promise<void>;
  };
}

async function loadModule<T>(relativePath: string): Promise<T> {
  return (await import(relativePath)) as T;
}

describe("Unidade — Camada de Variações de Produto (Task #89 [red])", () => {
  describe("VariantRepository (backend/src/repositories/variant.repository.ts)", () => {
    it("deve buscar combinação (productId, size, color) de forma case-insensitive e criar lote em transação", async () => {
      const { VariantRepository } = await loadModule<VariantRepositoryModule>(
        "../../repositories/variant.repository"
      );

      const mockFindFirst = vi.fn().mockResolvedValue(null);
      const mockCreate = vi.fn().mockImplementation(async ({ data }) => ({
        id: "var-1",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      const mockTransaction = vi
        .fn()
        .mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            productVariant: { create: mockCreate },
          })
        );

      const repo = new VariantRepository({
        productVariant: {
          findFirst: mockFindFirst,
          findMany: vi.fn(),
          findUnique: vi.fn(),
          create: mockCreate,
          update: vi.fn(),
          delete: vi.fn(),
        },
        orderItem: {
          count: vi.fn().mockResolvedValue(0),
        },
        $transaction: mockTransaction,
      });

      await repo.findByProductSizeColorInsensitive("prod-1", "P", "Preto", "var-ignore");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          productId: "prod-1",
          size: { equals: "P", mode: "insensitive" },
          color: { equals: "Preto", mode: "insensitive" },
          id: { not: "var-ignore" },
        },
      });

      const created = await repo.createManyAtomic([
        { productId: "prod-1", size: "P", color: "Preto", stock: 5 },
        { productId: "prod-1", size: "M", color: "Branco", stock: 3 },
      ]);

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(created).toHaveLength(2);
    });
  });

  describe("VariantService (backend/src/services/variant.service.ts)", () => {
    it("deve normalizar size para UPPERCASE e color com trim() ao criar variação", async () => {
      const { VariantService } = await loadModule<VariantServiceModule>(
        "../../services/variant.service"
      );

      const mockCreate = vi.fn().mockImplementation(async (data) => ({
        id: "var-10",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const service = new VariantService(
        {
          findByProductId: vi.fn(),
          findById: vi.fn(),
          findByProductSizeColorInsensitive: vi.fn().mockResolvedValue(null),
          create: mockCreate,
          createManyAtomic: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          hasOrderItems: vi.fn(),
        },
        {
          findById: vi.fn().mockResolvedValue({ id: "prod-1", name: "Vestido" }),
        }
      );

      const result = (await service.createVariants("prod-1", {
        size: "  único ",
        color: "  Verde Militar  ",
        stock: 7,
      })) as VariantRecord;

      expect(mockCreate).toHaveBeenCalledWith({
        productId: "prod-1",
        size: "ÚNICO",
        color: "Verde Militar",
        stock: 7,
      });
      expect(result.size).toBe("ÚNICO");
      expect(result.color).toBe("Verde Militar");
    });

    it("deve rejeitar stock negativo ou decimal com erro 400", async () => {
      const { VariantService } = await loadModule<VariantServiceModule>(
        "../../services/variant.service"
      );

      const service = new VariantService(
        {
          findByProductId: vi.fn(),
          findById: vi.fn(),
          findByProductSizeColorInsensitive: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
          createManyAtomic: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          hasOrderItems: vi.fn(),
        },
        {
          findById: vi.fn().mockResolvedValue({ id: "prod-1", name: "Vestido" }),
        }
      );

      await expect(
        service.createVariants("prod-1", {
          size: "M",
          color: "Azul",
          stock: -1,
        })
      ).rejects.toMatchObject({ statusCode: 400 });

      await expect(
        service.createVariants("prod-1", {
          size: "M",
          color: "Azul",
          stock: 2.5,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("deve rejeitar colisão case-insensitive dentro do próprio lote ou com o banco com erro 409", async () => {
      const { VariantService } = await loadModule<VariantServiceModule>(
        "../../services/variant.service"
      );

      const mockCreateManyAtomic = vi.fn();

      const service = new VariantService(
        {
          findByProductId: vi.fn(),
          findById: vi.fn(),
          findByProductSizeColorInsensitive: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
          createManyAtomic: mockCreateManyAtomic,
          update: vi.fn(),
          delete: vi.fn(),
          hasOrderItems: vi.fn(),
        },
        {
          findById: vi.fn().mockResolvedValue({ id: "prod-1", name: "Vestido" }),
        }
      );

      await expect(
        service.createVariants("prod-1", {
          variants: [
            { size: "p", color: "Preto", stock: 4 },
            { size: "P", color: "preto", stock: 2 },
          ],
        })
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(mockCreateManyAtomic).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando variantId pertencer a outro productId no PATCH ou DELETE", async () => {
      const { VariantService } = await loadModule<VariantServiceModule>(
        "../../services/variant.service"
      );

      const service = new VariantService(
        {
          findByProductId: vi.fn(),
          findById: vi.fn().mockResolvedValue({
            id: "var-other",
            productId: "prod-2",
            size: "G",
            color: "Rosa",
            stock: 3,
          }),
          findByProductSizeColorInsensitive: vi.fn(),
          create: vi.fn(),
          createManyAtomic: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          hasOrderItems: vi.fn(),
        },
        {
          findById: vi.fn().mockResolvedValue({ id: "prod-1", name: "Vestido" }),
        }
      );

      await expect(
        service.updateVariant("prod-1", "var-other", { stock: 0 })
      ).rejects.toMatchObject({ statusCode: 404 });

      await expect(service.deleteVariant("prod-1", "var-other")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("deve bloquear DELETE com 409 orientando zerar o estoque quando houver OrderItem vinculado", async () => {
      const { VariantService } = await loadModule<VariantServiceModule>(
        "../../services/variant.service"
      );

      const mockDelete = vi.fn();
      const service = new VariantService(
        {
          findByProductId: vi.fn(),
          findById: vi.fn().mockResolvedValue({
            id: "var-1",
            productId: "prod-1",
            size: "P",
            color: "Preto",
            stock: 2,
          }),
          findByProductSizeColorInsensitive: vi.fn(),
          create: vi.fn(),
          createManyAtomic: vi.fn(),
          update: vi.fn(),
          delete: mockDelete,
          hasOrderItems: vi.fn().mockResolvedValue(true),
        },
        {
          findById: vi.fn().mockResolvedValue({ id: "prod-1", name: "Vestido" }),
        }
      );

      await expect(service.deleteVariant("prod-1", "var-1")).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringMatching(/estoque|stock/i),
      });
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe("VariantController (backend/src/controllers/variant.controller.ts)", () => {
    it("deve retornar 201 Created ao criar variação e propagar statusCode de VariantError", async () => {
      const { VariantController } = await loadModule<VariantControllerModule>(
        "../../controllers/variant.controller"
      );
      const { VariantError } = await loadModule<VariantServiceModule>(
        "../../services/variant.service"
      );

      const mockCreateVariants = vi
        .fn()
        .mockResolvedValueOnce({
          id: "var-1",
          productId: "prod-1",
          size: "M",
          color: "Preto",
          stock: 10,
        })
        .mockRejectedValueOnce(new VariantError("Variação duplicada para este produto.", 409));

      const controller = new VariantController({
        listByProduct: vi.fn(),
        createVariants: mockCreateVariants,
        updateVariant: vi.fn(),
        deleteVariant: vi.fn(),
      });

      const statusMock = vi.fn().mockReturnThis();
      const jsonMock = vi.fn().mockReturnThis();
      const res = {
        status: statusMock,
        json: jsonMock,
      } as unknown as Response;

      await controller.create(
        {
          params: { productId: "prod-1" },
          body: { size: "m", color: "Preto", stock: 10 },
        } as unknown as Request,
        res
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ size: "M", color: "Preto", stock: 10 })
      );

      await controller.create(
        {
          params: { productId: "prod-1" },
          body: { size: "m", color: "Preto", stock: 10 },
        } as unknown as Request,
        res
      );

      expect(statusMock).toHaveBeenLastCalledWith(409);
    });
  });

  describe("Ajuste Manual de Estoque (PBI #19 / Task #175 [red])", () => {
    it("deve atualizar stock para 0 ou positivo e emitir log estruturado STOCK_ADJUSTMENT quando o saldo mudar", async () => {
      const { VariantService } = await loadModule<VariantServiceModule>(
        "../../services/variant.service"
      );

      let currentStock = 5;
      const mockUpdate = vi.fn().mockImplementation(async (_id, data) => {
        currentStock = data.stock ?? currentStock;
        return {
          id: "var-1",
          productId: "prod-1",
          size: "M",
          color: "Preto",
          stock: currentStock,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
      const mockFindById = vi.fn().mockImplementation(async () => ({
        id: "var-1",
        productId: "prod-1",
        size: "M",
        color: "Preto",
        stock: currentStock,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      const mockStockLogger = vi.fn();

      const service = new VariantService(
        {
          findByProductId: vi.fn(),
          findById: mockFindById,
          findByProductSizeColorInsensitive: vi.fn(),
          create: vi.fn(),
          createManyAtomic: vi.fn(),
          update: mockUpdate,
          delete: vi.fn(),
          hasOrderItems: vi.fn(),
        },
        {
          findById: vi.fn().mockResolvedValue({ id: "prod-1" }),
        },
        mockStockLogger
      );

      const zeroed = await service.updateVariant("prod-1", "var-1", { stock: 0 }, "admin-1");
      expect(zeroed.stock).toBe(0);
      expect(mockStockLogger).toHaveBeenCalledTimes(1);
      expect(mockStockLogger).toHaveBeenLastCalledWith(
        expect.objectContaining({
          event: "STOCK_ADJUSTMENT",
          productId: "prod-1",
          variantId: "var-1",
          previousStock: 5,
          newStock: 0,
          delta: -5,
          actorId: "admin-1",
          timestamp: expect.any(String),
        })
      );

      const replenished = await service.updateVariant("prod-1", "var-1", { stock: 12 }, "admin-1");
      expect(replenished.stock).toBe(12);
      expect(mockStockLogger).toHaveBeenCalledTimes(2);
      expect(mockStockLogger).toHaveBeenLastCalledWith(
        expect.objectContaining({
          event: "STOCK_ADJUSTMENT",
          productId: "prod-1",
          variantId: "var-1",
          previousStock: 0,
          newStock: 12,
          delta: 12,
          actorId: "admin-1",
          timestamp: expect.any(String),
        })
      );

      const unchanged = await service.updateVariant("prod-1", "var-1", { stock: 12 }, "admin-1");
      expect(unchanged.stock).toBe(12);
      expect(mockStockLogger).toHaveBeenCalledTimes(2);
    });

    it("deve rejeitar stock negativo, decimal, NaN, null, string ou PATCH vazio com erro 400", async () => {
      const { VariantService } = await loadModule<VariantServiceModule>(
        "../../services/variant.service"
      );

      const mockUpdate = vi.fn();
      const mockStockLogger = vi.fn();

      const service = new VariantService(
        {
          findByProductId: vi.fn(),
          findById: vi.fn().mockResolvedValue({
            id: "var-1",
            productId: "prod-1",
            size: "P",
            color: "Nude",
            stock: 4,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          findByProductSizeColorInsensitive: vi.fn(),
          create: vi.fn(),
          createManyAtomic: vi.fn(),
          update: mockUpdate,
          delete: vi.fn(),
          hasOrderItems: vi.fn(),
        },
        {
          findById: vi.fn().mockResolvedValue({ id: "prod-1" }),
        },
        mockStockLogger
      );

      const invalidPayloads: Array<Record<string, unknown>> = [
        { stock: -1 },
        { stock: 2.5 },
        { stock: Number.NaN },
        { stock: null },
        { stock: "10" },
        {},
      ];

      for (const payload of invalidPayloads) {
        await expect(
          service.updateVariant("prod-1", "var-1", payload, "admin-1")
        ).rejects.toMatchObject({ statusCode: 400 });
      }

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockStockLogger).not.toHaveBeenCalled();
    });

    it("deve retornar 404 quando produto ou variação não existir ou não pertencer ao produto", async () => {
      const { VariantService } = await loadModule<VariantServiceModule>(
        "../../services/variant.service"
      );

      const serviceWithoutProduct = new VariantService(
        {
          findByProductId: vi.fn(),
          findById: vi.fn(),
          findByProductSizeColorInsensitive: vi.fn(),
          create: vi.fn(),
          createManyAtomic: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          hasOrderItems: vi.fn(),
        },
        {
          findById: vi.fn().mockResolvedValue(null),
        }
      );

      await expect(
        serviceWithoutProduct.updateVariant("prod-missing", "var-1", { stock: 5 })
      ).rejects.toMatchObject({ statusCode: 404 });

      const serviceWithoutVariant = new VariantService(
        {
          findByProductId: vi.fn(),
          findById: vi.fn().mockResolvedValue(null),
          findByProductSizeColorInsensitive: vi.fn(),
          create: vi.fn(),
          createManyAtomic: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          hasOrderItems: vi.fn(),
        },
        {
          findById: vi.fn().mockResolvedValue({ id: "prod-1" }),
        }
      );

      await expect(
        serviceWithoutVariant.updateVariant("prod-1", "var-missing", { stock: 5 })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("deve encaminhar req.user.id como actorId no VariantController.update e retornar 200 OK", async () => {
      const { VariantController } = await loadModule<VariantControllerModule>(
        "../../controllers/variant.controller"
      );

      const mockUpdateVariant = vi.fn().mockResolvedValue({
        id: "var-1",
        productId: "prod-1",
        size: "M",
        color: "Preto",
        stock: 8,
      });

      const controller = new VariantController({
        listByProduct: vi.fn(),
        createVariants: vi.fn(),
        updateVariant: mockUpdateVariant,
        deleteVariant: vi.fn(),
      });

      const statusMock = vi.fn().mockReturnThis();
      const jsonMock = vi.fn().mockReturnThis();
      const res = {
        status: statusMock,
        json: jsonMock,
      } as unknown as Response;

      await controller.update(
        {
          params: { productId: "prod-1", variantId: "var-1" },
          body: { stock: 8 },
          user: { id: "admin-99", email: "admin@meninamulher.com", role: "ADMIN" },
        } as unknown as Request,
        res
      );

      expect(mockUpdateVariant).toHaveBeenCalledWith("prod-1", "var-1", { stock: 8 }, "admin-99");
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ id: "var-1", stock: 8 }));
    });
  });

  describe("Cálculo de Disponibilidade e Bloqueio de Carrinho (PBI #21 / Task #191 [red])", () => {
    it("deve calcular availabilityStatus, availabilityLabel e available em listByProduct para os 3 estados (0, 1..3, >3)", async () => {
      const { VariantService } = await loadModule<VariantServiceModule>(
        "../../services/variant.service"
      );

      const now = new Date();
      const mockVariants: VariantRecord[] = [
        {
          id: "v-0",
          productId: "prod-1",
          size: "P",
          color: "Preto",
          stock: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "v-1",
          productId: "prod-1",
          size: "M",
          color: "Preto",
          stock: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "v-3",
          productId: "prod-1",
          size: "G",
          color: "Preto",
          stock: 3,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "v-4",
          productId: "prod-1",
          size: "GG",
          color: "Preto",
          stock: 4,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const service = new VariantService(
        {
          findByProductId: vi.fn().mockResolvedValue(mockVariants),
          findById: vi.fn(),
          findByProductSizeColorInsensitive: vi.fn(),
          create: vi.fn(),
          createManyAtomic: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          hasOrderItems: vi.fn(),
        },
        {
          findById: vi.fn().mockResolvedValue({ id: "prod-1" }),
        }
      );

      const result = await service.listByProduct("prod-1");

      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({
        id: "v-0",
        stock: 0,
        availabilityStatus: "OUT_OF_STOCK",
        availabilityLabel: "esgotado",
        available: false,
      });
      expect(result[1]).toMatchObject({
        id: "v-1",
        stock: 1,
        availabilityStatus: "LOW_STOCK",
        availabilityLabel: "últimas unidades",
        available: true,
      });
      expect(result[2]).toMatchObject({
        id: "v-3",
        stock: 3,
        availabilityStatus: "LOW_STOCK",
        availabilityLabel: "últimas unidades",
        available: true,
      });
      expect(result[3]).toMatchObject({
        id: "v-4",
        stock: 4,
        availabilityStatus: "AVAILABLE",
        availabilityLabel: "disponível",
        available: true,
      });
    });

    it("deve validar adição ao carrinho em validateCartAvailability, bloqueando esgotado (409), excesso de estoque (409) e quantidade inválida (400)", async () => {
      const { VariantService } = await loadModule<
        VariantServiceModule & {
          VariantService: new (...args: unknown[]) => {
            validateCartAvailability: (
              productId: string,
              variantId: string,
              quantity?: unknown
            ) => Promise<Record<string, unknown>>;
          };
        }
      >("../../services/variant.service");

      const now = new Date();
      const findByIdMock = vi.fn().mockImplementation(async (id: string) => {
        if (id === "v-zero") {
          return {
            id: "v-zero",
            productId: "prod-1",
            size: "P",
            color: "Preto",
            stock: 0,
            createdAt: now,
            updatedAt: now,
          };
        }
        if (id === "v-low") {
          return {
            id: "v-low",
            productId: "prod-1",
            size: "M",
            color: "Preto",
            stock: 2,
            createdAt: now,
            updatedAt: now,
          };
        }
        return null;
      });

      const service = new VariantService(
        {
          findByProductId: vi.fn(),
          findById: findByIdMock,
          findByProductSizeColorInsensitive: vi.fn(),
          create: vi.fn(),
          createManyAtomic: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          hasOrderItems: vi.fn(),
        },
        {
          findById: vi.fn().mockResolvedValue({ id: "prod-1" }),
        }
      ) as unknown as {
        validateCartAvailability: (
          productId: string,
          variantId: string,
          quantity?: unknown
        ) => Promise<Record<string, unknown>>;
      };

      const okResult = await service.validateCartAvailability("prod-1", "v-low", 2);
      expect(okResult).toMatchObject({
        id: "v-low",
        stock: 2,
        availabilityStatus: "LOW_STOCK",
        availabilityLabel: "últimas unidades",
        available: true,
      });

      await expect(service.validateCartAvailability("prod-1", "v-zero", 1)).rejects.toMatchObject({
        statusCode: 409,
      });

      await expect(service.validateCartAvailability("prod-1", "v-low", 3)).rejects.toMatchObject({
        statusCode: 409,
      });

      for (const invalidQty of [0, -1, 1.5, "2"]) {
        await expect(
          service.validateCartAvailability("prod-1", "v-low", invalidQty)
        ).rejects.toMatchObject({ statusCode: 400 });
      }

      await expect(
        service.validateCartAvailability("prod-1", "v-missing", 1)
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("deve delegar validação de carrinho no VariantController.validateCart e retornar 200 OK", async () => {
      const { VariantController } = await loadModule<
        VariantControllerModule & {
          VariantController: new (variantService?: unknown) => {
            validateCart: (req: Request, res: Response) => Promise<void>;
          };
        }
      >("../../controllers/variant.controller");

      const mockValidateCart = vi.fn().mockResolvedValue({
        id: "var-1",
        productId: "prod-1",
        stock: 5,
        availabilityStatus: "AVAILABLE",
        availabilityLabel: "disponível",
        available: true,
      });

      const controller = new VariantController({
        listByProduct: vi.fn(),
        createVariants: vi.fn(),
        updateVariant: vi.fn(),
        deleteVariant: vi.fn(),
        validateCartAvailability: mockValidateCart,
      }) as unknown as {
        validateCart: (req: Request, res: Response) => Promise<void>;
      };

      const statusMock = vi.fn().mockReturnThis();
      const jsonMock = vi.fn().mockReturnThis();
      const res = { status: statusMock, json: jsonMock } as unknown as Response;

      await controller.validateCart(
        {
          params: { productId: "prod-1", variantId: "var-1" },
          body: { quantity: 2 },
        } as unknown as Request,
        res
      );

      expect(mockValidateCart).toHaveBeenCalledWith("prod-1", "var-1", 2);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "var-1",
          availabilityStatus: "AVAILABLE",
          availabilityLabel: "disponível",
          available: true,
        })
      );
    });
  });
});
