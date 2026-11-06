import { describe, expect, it, vi } from "vitest";

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
}

interface ProductRecord {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  active: boolean;
  featured: boolean;
  categoryId: string | null;
}

interface CategoryRepositoryInstance {
  findAll: () => Promise<CategoryRecord[]>;
  findById: (id: string) => Promise<CategoryRecord | null>;
  findBySlug: (slug: string) => Promise<CategoryRecord | null>;
}

interface CategoryRepositoryModule {
  CategoryRepository: new (prismaClient?: unknown) => CategoryRepositoryInstance;
}

interface ProductRepositoryInstance {
  findPublicActive: (filters?: {
    featured?: boolean;
    categoryId?: string;
    categorySlug?: string;
  }) => Promise<ProductRecord[]>;
  findAllAdmin: () => Promise<ProductRecord[]>;
  findPublicById: (id: string) => Promise<ProductRecord | null>;
  findAdminById: (id: string) => Promise<ProductRecord | null>;
  create: (data: {
    name: string;
    description: string | null;
    price: number | string;
    active: boolean;
    featured: boolean;
    categoryId: string | null;
  }) => Promise<ProductRecord>;
  update: (
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      price: number | string;
      active: boolean;
      featured: boolean;
      categoryId: string | null;
    }>
  ) => Promise<ProductRecord>;
  delete: (id: string) => Promise<ProductRecord>;
  hasOrderItems: (productId: string) => Promise<boolean>;
}

interface ProductRepositoryModule {
  ProductRepository: new (prismaClient?: unknown) => ProductRepositoryInstance;
}

interface ProductServiceInstance {
  createProduct: (input: {
    name?: string;
    description?: string | null;
    price?: number | string;
    active?: boolean;
    featured?: boolean;
    categoryId?: string | null;
  }) => Promise<ProductRecord>;
  updateProduct: (
    id: string,
    input: {
      name?: string;
      description?: string | null;
      price?: number | string;
      active?: boolean;
      featured?: boolean;
      categoryId?: string | null;
    }
  ) => Promise<ProductRecord>;
  deleteProduct: (id: string) => Promise<void>;
}

interface ProductServiceModule {
  ProductService: new (
    productRepository?: ProductRepositoryInstance,
    categoryRepository?: CategoryRepositoryInstance
  ) => ProductServiceInstance;
  ProductError: new (message: string, statusCode: number) => Error & { statusCode: number };
}

interface CategoryControllerInstance {
  list: (req: unknown, res: unknown) => Promise<void>;
}

interface CategoryControllerModule {
  CategoryController: new (
    categoryRepository?: CategoryRepositoryInstance
  ) => CategoryControllerInstance;
}

interface ProductControllerInstance {
  listPublic: (req: unknown, res: unknown) => Promise<void>;
  getPublicById: (req: unknown, res: unknown) => Promise<void>;
  listAdmin: (req: unknown, res: unknown) => Promise<void>;
  getAdminById: (req: unknown, res: unknown) => Promise<void>;
  create: (req: unknown, res: unknown) => Promise<void>;
  update: (req: unknown, res: unknown) => Promise<void>;
  delete: (req: unknown, res: unknown) => Promise<void>;
}

interface ProductControllerModule {
  ProductController: new (
    productService?: ProductServiceInstance,
    productRepository?: ProductRepositoryInstance
  ) => ProductControllerInstance;
}

async function loadModule<T>(relativePath: string): Promise<T> {
  return (await import(relativePath)) as T;
}

function createMockResponse() {
  const res: {
    statusCode: number;
    body: unknown;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  } = {
    statusCode: 200,
    body: undefined,
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });
  res.send.mockImplementation(() => res);
  return res;
}

describe("Testes Unitários — Produtos e Categorias por Camada (PBI #16 / Task #93)", () => {
  describe("1. CategoryRepository e ProductRepository — Isolamento 100% do PrismaClient", () => {
    it("CategoryRepository.findAll e findById devem consultar prisma.category isoladamente", async () => {
      const { CategoryRepository } = await loadModule<CategoryRepositoryModule>(
        "../../repositories/category.repository"
      );

      const mockCategories: CategoryRecord[] = [
        { id: "cat-1", name: "Conjuntos", slug: "conjuntos" },
        { id: "cat-2", name: "Sutiãs", slug: "sutias" },
      ];

      const mockPrisma = {
        category: {
          findMany: vi.fn().mockResolvedValue(mockCategories),
          findUnique: vi.fn().mockResolvedValue(mockCategories[0]),
        },
      };

      const repo = new CategoryRepository(mockPrisma);
      const all = await repo.findAll();
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
      });
      expect(all).toEqual(mockCategories);

      const single = await repo.findById("cat-1");
      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: "cat-1" },
      });
      expect(single).toEqual(mockCategories[0]);
    });

    it("ProductRepository deve filtrar active: true nas consultas públicas e retornar todos nas administrativas", async () => {
      const { ProductRepository } = await loadModule<ProductRepositoryModule>(
        "../../repositories/product.repository"
      );

      const mockProducts: ProductRecord[] = [
        {
          id: "prod-1",
          name: "Conjunto Renda Aurora",
          description: "Renda macia",
          price: "89.90",
          active: true,
          featured: true,
          categoryId: "cat-1",
        },
      ];

      const mockPrisma = {
        product: {
          findMany: vi.fn().mockResolvedValue(mockProducts),
          findFirst: vi.fn().mockResolvedValue(mockProducts[0]),
          findUnique: vi.fn().mockResolvedValue(mockProducts[0]),
          create: vi.fn().mockResolvedValue(mockProducts[0]),
          update: vi.fn().mockResolvedValue(mockProducts[0]),
          delete: vi.fn().mockResolvedValue(mockProducts[0]),
        },
        orderItem: {
          count: vi.fn().mockResolvedValue(0),
        },
      };

      const repo = new ProductRepository(mockPrisma);

      await repo.findPublicActive({ featured: true, categoryId: "cat-1" });
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
            featured: true,
            categoryId: "cat-1",
          }),
        })
      );

      await repo.findAllAdmin();
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );

      await repo.findPublicById("prod-1");
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "prod-1", active: true },
        })
      );
    });
  });

  describe("2. ProductService — Regras de Domínio, Validações e Proteção de Histórico", () => {
    it("createProduct deve normalizar name/description com trim(), aplicar defaults (active=true, featured=false) e validar categoryId", async () => {
      const { ProductService } = await loadModule<ProductServiceModule>(
        "../../services/product.service"
      );

      const mockProductRepo: ProductRepositoryInstance = {
        findPublicActive: vi.fn(),
        findAllAdmin: vi.fn(),
        findPublicById: vi.fn(),
        findAdminById: vi.fn(),
        create: vi.fn().mockImplementation(async (data) => ({ id: "prod-novo", ...data })),
        update: vi.fn(),
        delete: vi.fn(),
        hasOrderItems: vi.fn(),
      };

      const mockCategoryRepo: CategoryRepositoryInstance = {
        findAll: vi.fn(),
        findById: vi.fn().mockResolvedValue({ id: "cat-1", name: "Conjuntos", slug: "conjuntos" }),
        findBySlug: vi.fn(),
      };

      const service = new ProductService(mockProductRepo, mockCategoryRepo);
      const created = await service.createProduct({
        name: "  Conjunto Renda Luxo  ",
        description: "  Renda floral importada  ",
        price: 99.9,
        categoryId: "cat-1",
      });

      expect(mockCategoryRepo.findById).toHaveBeenCalledWith("cat-1");
      expect(mockProductRepo.create).toHaveBeenCalledWith({
        name: "Conjunto Renda Luxo",
        description: "Renda floral importada",
        price: 99.9,
        active: true,
        featured: false,
        categoryId: "cat-1",
      });
      expect(created.name).toBe("Conjunto Renda Luxo");
    });

    it("createProduct deve rejeitar com 400 para name vazio ou price < 0, e 404 para categoryId inexistente", async () => {
      const { ProductService } = await loadModule<ProductServiceModule>(
        "../../services/product.service"
      );

      const mockProductRepo: ProductRepositoryInstance = {
        findPublicActive: vi.fn(),
        findAllAdmin: vi.fn(),
        findPublicById: vi.fn(),
        findAdminById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        hasOrderItems: vi.fn(),
      };

      const mockCategoryRepo: CategoryRepositoryInstance = {
        findAll: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        findBySlug: vi.fn(),
      };

      const service = new ProductService(mockProductRepo, mockCategoryRepo);

      await expect(service.createProduct({ name: "   ", price: 50 })).rejects.toMatchObject({
        statusCode: 400,
      });

      await expect(
        service.createProduct({ name: "Produto Válido", price: -10 })
      ).rejects.toMatchObject({ statusCode: 400 });

      await expect(
        service.createProduct({ name: "Produto Válido", price: 50, categoryId: "cat-inexistente" })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("updateProduct deve permitir ocultar e reativar produto (active: false | true) e rejeitar 404 se não existir", async () => {
      const { ProductService } = await loadModule<ProductServiceModule>(
        "../../services/product.service"
      );

      const existingProduct: ProductRecord = {
        id: "prod-1",
        name: "Sutiã Pérola",
        description: null,
        price: "59.90",
        active: true,
        featured: false,
        categoryId: null,
      };

      const mockProductRepo: ProductRepositoryInstance = {
        findPublicActive: vi.fn(),
        findAllAdmin: vi.fn(),
        findPublicById: vi.fn(),
        findAdminById: vi.fn().mockResolvedValueOnce(existingProduct).mockResolvedValueOnce(null),
        create: vi.fn(),
        update: vi.fn().mockImplementation(async (_id, data) => ({
          ...existingProduct,
          ...data,
        })),
        delete: vi.fn(),
        hasOrderItems: vi.fn(),
      };

      const mockCategoryRepo: CategoryRepositoryInstance = {
        findAll: vi.fn(),
        findById: vi.fn(),
        findBySlug: vi.fn(),
      };

      const service = new ProductService(mockProductRepo, mockCategoryRepo);
      const updated = await service.updateProduct("prod-1", { active: false });
      expect(updated.active).toBe(false);

      await expect(
        service.updateProduct("prod-inexistente", { active: true })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("deleteProduct deve excluir produto sem pedidos e retornar 409 Conflict amigável quando houver OrderItem vinculado", async () => {
      const { ProductService } = await loadModule<ProductServiceModule>(
        "../../services/product.service"
      );

      const existingProduct: ProductRecord = {
        id: "prod-1",
        name: "Conjunto Renda Aurora",
        description: null,
        price: "89.90",
        active: true,
        featured: true,
        categoryId: null,
      };

      const mockProductRepo: ProductRepositoryInstance = {
        findPublicActive: vi.fn(),
        findAllAdmin: vi.fn(),
        findPublicById: vi.fn(),
        findAdminById: vi.fn().mockResolvedValue(existingProduct),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue(existingProduct),
        hasOrderItems: vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true),
      };

      const mockCategoryRepo: CategoryRepositoryInstance = {
        findAll: vi.fn(),
        findById: vi.fn(),
        findBySlug: vi.fn(),
      };

      const service = new ProductService(mockProductRepo, mockCategoryRepo);

      await service.deleteProduct("prod-1");
      expect(mockProductRepo.delete).toHaveBeenCalledWith("prod-1");

      await expect(service.deleteProduct("prod-1")).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });

  describe("3. CategoryController e ProductController — Fluxo HTTP e Atalho Controller -> Repository", () => {
    it("CategoryController.list deve usar o atalho Controller -> Repository e retornar 200 OK", async () => {
      const { CategoryController } = await loadModule<CategoryControllerModule>(
        "../../controllers/category.controller"
      );

      const mockCategories: CategoryRecord[] = [
        { id: "cat-1", name: "Conjuntos", slug: "conjuntos" },
      ];
      const mockCategoryRepo: CategoryRepositoryInstance = {
        findAll: vi.fn().mockResolvedValue(mockCategories),
        findById: vi.fn(),
        findBySlug: vi.fn(),
      };

      const controller = new CategoryController(mockCategoryRepo);
      const res = createMockResponse();

      await controller.list({}, res);
      expect(mockCategoryRepo.findAll).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockCategories);
    });

    it("ProductController deve retornar 200/201/404/409 corretamente nas operações públicas e administrativas", async () => {
      const { ProductController } = await loadModule<ProductControllerModule>(
        "../../controllers/product.controller"
      );
      const { ProductError } = await loadModule<ProductServiceModule>(
        "../../services/product.service"
      );

      const sampleProduct: ProductRecord = {
        id: "prod-1",
        name: "Conjunto Renda Aurora",
        description: "Descrição",
        price: "89.90",
        active: true,
        featured: true,
        categoryId: "cat-1",
      };

      const mockProductRepo: ProductRepositoryInstance = {
        findPublicActive: vi.fn().mockResolvedValue([sampleProduct]),
        findAllAdmin: vi.fn().mockResolvedValue([sampleProduct]),
        findPublicById: vi.fn().mockResolvedValueOnce(sampleProduct).mockResolvedValueOnce(null),
        findAdminById: vi.fn().mockResolvedValue(sampleProduct),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        hasOrderItems: vi.fn(),
      };

      const mockProductService: ProductServiceInstance = {
        createProduct: vi.fn().mockResolvedValue(sampleProduct),
        updateProduct: vi.fn().mockResolvedValue({ ...sampleProduct, active: false }),
        deleteProduct: vi
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new ProductError("Conflito com pedidos", 409)),
      };

      const controller = new ProductController(mockProductService, mockProductRepo);

      const resListPublic = createMockResponse();
      await controller.listPublic({ query: {} }, resListPublic);
      expect(resListPublic.statusCode).toBe(200);

      const resGetOk = createMockResponse();
      await controller.getPublicById({ params: { id: "prod-1" } }, resGetOk);
      expect(resGetOk.statusCode).toBe(200);

      const resGet404 = createMockResponse();
      await controller.getPublicById({ params: { id: "prod-oculto" } }, resGet404);
      expect(resGet404.statusCode).toBe(404);

      const resCreate = createMockResponse();
      await controller.create({ body: { name: "Conjunto Renda Aurora", price: 89.9 } }, resCreate);
      expect(resCreate.statusCode).toBe(201);

      const resDeleteOk = createMockResponse();
      await controller.delete({ params: { id: "prod-1" } }, resDeleteOk);
      expect([200, 204]).toContain(resDeleteOk.statusCode);

      const resDelete409 = createMockResponse();
      await controller.delete({ params: { id: "prod-1" } }, resDelete409);
      expect(resDelete409.statusCode).toBe(409);
    });
  });
});
