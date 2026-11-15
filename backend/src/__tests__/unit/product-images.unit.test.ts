import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ProductImageController } from "../../controllers/product-image.controller";
import {
  ALLOWED_IMAGE_MIMES,
  FILE_TOO_LARGE_MESSAGE,
  INVALID_FILE_FORMAT_MESSAGE,
  MAX_UPLOAD_FILE_SIZE_BYTES,
} from "../../lib/upload";
import {
  type ProductImagePrismaDelegate,
  ProductImageRepository,
} from "../../repositories/product-image.repository";
import {
  ProductImageError,
  ProductImageService,
  type ProductImageServicePort,
} from "../../services/product-image.service";

function createMockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe("Testes Unitários — Galeria e Upload de Fotos de Produtos (PBI #17 / Task #205)", () => {
  describe("Configuração de Upload (upload.ts)", () => {
    it("define o limite máximo de 10 MB e permite apenas JPG, PNG e WEBP", () => {
      expect(MAX_UPLOAD_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
      expect(ALLOWED_IMAGE_MIMES).toEqual(["image/jpeg", "image/pjpeg", "image/png", "image/webp"]);
      expect(FILE_TOO_LARGE_MESSAGE).toContain("10 MB");
      expect(INVALID_FILE_FORMAT_MESSAGE).toContain("JPG, PNG e WEBP");
    });
  });

  describe("ProductImageRepository", () => {
    it("isola chamadas ao PrismaClient ordenando por position ASC e reordenando em transação", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const findUnique = vi.fn().mockResolvedValue(null);
      const create = vi.fn().mockImplementation(async ({ data }) => ({
        id: "img-1",
        createdAt: new Date(),
        ...data,
      }));
      const update = vi.fn().mockImplementation(async ({ where, data }) => ({
        id: where.id,
        productId: "prod-1",
        url: "https://cdn/1.webp",
        altText: "Foto",
        position: data.position ?? 0,
        createdAt: new Date(),
      }));
      const del = vi.fn().mockResolvedValue({ id: "img-1" });

      const mockDb: ProductImagePrismaDelegate = {
        productImage: {
          findMany,
          findUnique,
          create,
          update,
          delete: del,
        },
        $transaction: async (fn) => fn({ productImage: { update } }),
      };

      const repo = new ProductImageRepository(mockDb);

      await repo.findByProductId("prod-1");
      expect(findMany).toHaveBeenCalledWith({
        where: { productId: "prod-1" },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });

      const created = await repo.create({
        productId: "prod-1",
        url: "https://cdn/foto.webp",
        altText: "Sutiã Renda",
        position: 0,
      });
      expect(created.id).toBe("img-1");

      const reordered = await repo.reorderPositions([
        { id: "img-2", position: 0 },
        { id: "img-1", position: 1 },
      ]);
      expect(reordered).toHaveLength(2);
      expect(update).toHaveBeenCalledTimes(2);
    });
  });

  describe("ProductImageService", () => {
    it("adiciona foto preenchendo altText com o nome do produto quando omitido e gerencia foto principal (position 0)", async () => {
      const store: Array<{
        id: string;
        productId: string;
        url: string;
        altText: string | null;
        position: number;
        createdAt: Date;
      }> = [];

      const mockRepo = {
        findByProductId: vi.fn(async (productId: string) =>
          store.filter((i) => i.productId === productId).sort((a, b) => a.position - b.position)
        ),
        findById: vi.fn(async (id: string) => store.find((i) => i.id === id) ?? null),
        create: vi.fn(async (data) => {
          const item = { id: `img-${store.length + 1}`, createdAt: new Date(), ...data };
          store.push(item);
          return item;
        }),
        update: vi.fn(async (id: string, data) => {
          const item = store.find((i) => i.id === id)!;
          if (data.altText !== undefined) item.altText = data.altText;
          if (data.position !== undefined) item.position = data.position;
          return { ...item };
        }),
        delete: vi.fn(async (id: string) => {
          const idx = store.findIndex((i) => i.id === id);
          const [removed] = store.splice(idx, 1);
          return removed;
        }),
        reorderPositions: vi.fn(async (updates: Array<{ id: string; position: number }>) => {
          for (const u of updates) {
            const found = store.find((i) => i.id === u.id);
            if (found) found.position = u.position;
          }
          return store;
        }),
      } as unknown as ProductImageRepository;

      const mockProductRepo = {
        findAdminById: vi.fn(async (id: string) =>
          id === "prod-1" ? { id: "prod-1", name: "Sutiã Renda Noir" } : null
        ),
      };

      const service = new ProductImageService(mockRepo, mockProductRepo);

      // 1. Primeira foto sem altText -> usa nome da peça e position 0
      const first = await service.addProductImage("prod-1", {
        url: "  https://cdn/foto-1.webp  ",
      });
      expect(first.url).toBe("https://cdn/foto-1.webp");
      expect(first.altText).toBe("Sutiã Renda Noir");
      expect(first.position).toBe(0);

      // 2. Segunda foto marcada como isPrimary -> vira position 0 e empurra a anterior para 1
      const second = await service.addProductImage("prod-1", {
        url: "https://cdn/foto-capa.webp",
        altText: "Foto de Capa",
        isPrimary: true,
      });
      expect(second.position).toBe(0);
      const listAfterAdd = await service.listByProduct("prod-1");
      expect(listAfterAdd.map((i) => i.id)).toEqual(["img-2", "img-1"]);
      expect(listAfterAdd.map((i) => i.position)).toEqual([0, 1]);

      // 3. Promove img-1 de volta para capa (position: 0) via updateProductImage
      const promoted = await service.updateProductImage("prod-1", "img-1", { position: 0 });
      expect(promoted.position).toBe(0);

      // 4. Remove a foto de capa (img-1) -> img-2 passa a ser position 0 automaticamente
      await service.deleteProductImage("prod-1", "img-1");
      const remaining = await service.listByProduct("prod-1");
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("img-2");
      expect(remaining[0].position).toBe(0);
    });

    it("lança erros 400 e 404 apropriados para produto inexistente, URL vazia ou posição inválida", async () => {
      const mockRepo = {
        findByProductId: vi.fn().mockResolvedValue([]),
        findById: vi.fn().mockResolvedValue(null),
      } as unknown as ProductImageRepository;

      const mockProductRepo = {
        findAdminById: vi.fn(async (id: string) =>
          id === "prod-ok" ? { id: "prod-ok", name: "Peça" } : null
        ),
      };

      const service = new ProductImageService(mockRepo, mockProductRepo);

      await expect(service.listByProduct("inexistente")).rejects.toMatchObject({
        statusCode: 404,
      });

      await expect(service.addProductImage("prod-ok", { url: "   " })).rejects.toMatchObject({
        statusCode: 400,
      });

      await expect(
        service.addProductImage("prod-ok", { url: "https://cdn/a.jpg", position: -1 })
      ).rejects.toMatchObject({
        statusCode: 400,
      });

      await expect(service.deleteProductImage("prod-ok", "img-nao-existe")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("ProductImageController", () => {
    it("monta URL pública quando req.file está presente e repassa erros de domínio com statusCode correto", async () => {
      const addProductImage = vi.fn().mockResolvedValue({
        id: "img-10",
        productId: "prod-1",
        url: "http://localhost:3001/uploads/123.webp",
        altText: "Sutiã",
        position: 0,
      });

      const mockService: ProductImageServicePort = {
        listByProduct: vi.fn().mockResolvedValue([]),
        addProductImage,
        updateProductImage: vi
          .fn()
          .mockRejectedValue(new ProductImageError("Foto não encontrada.", 404)),
        deleteProductImage: vi.fn().mockResolvedValue(undefined),
      };

      const controller = new ProductImageController(mockService);

      const reqCreate = {
        params: { productId: "prod-1" },
        protocol: "http",
        get: () => "localhost:3001",
        file: { filename: "123.webp" },
        body: { altText: "Sutiã" },
      } as unknown as Request;
      const resCreate = createMockResponse();

      await controller.create(reqCreate, resCreate);
      expect(resCreate.status).toHaveBeenCalledWith(201);
      expect(addProductImage).toHaveBeenCalledWith(
        "prod-1",
        expect.objectContaining({
          url: "http://localhost:3001/uploads/123.webp",
          altText: "Sutiã",
        })
      );

      const reqUpdate = {
        params: { productId: "prod-1", imageId: "img-404" },
        body: { position: 0 },
      } as unknown as Request;
      const resUpdate = createMockResponse();

      await controller.update(reqUpdate, resUpdate);
      expect(resUpdate.status).toHaveBeenCalledWith(404);
      expect(resUpdate.json).toHaveBeenCalledWith({ error: "Foto não encontrada." });
    });
  });
});
