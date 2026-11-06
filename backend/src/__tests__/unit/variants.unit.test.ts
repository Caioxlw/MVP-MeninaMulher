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

interface VariantServiceModule {
  VariantError: new (
    message: string,
    statusCode?: number
  ) => Error & {
    statusCode: number;
  };
  VariantService: new (
    variantRepo?: unknown,
    productRepo?: unknown
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
      }
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
});
