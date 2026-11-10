import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAdminSession, getAdminSession, seedDemoAdminSession } from "../services/authApi";
import {
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  ProductsApiError,
  type Product,
  countProductsByStatus,
  createProduct,
  deleteProduct,
  filterProducts,
  formatPriceBRL,
  getAdminProductById,
  getAdminProducts,
  getCategories,
  getTotalStock,
  parsePriceInput,
  toggleProductActive,
  updateProduct,
} from "../services/productsApi";

const API_PRODUCT = {
  id: "p1",
  name: "Sutiã Renda Noir",
  description: "Renda francesa",
  price: "119.9",
  active: true,
  featured: true,
  categoryId: "c1",
  category: { id: "c1", name: "Sutiãs", slug: "sutias" },
  images: [],
  variants: [
    { id: "v1", size: "P", color: "Preto", stock: 3 },
    { id: "v2", size: "M", color: "Preto", stock: 2 },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(...responses: Array<Response | Error>) {
  const fn = vi.fn();
  for (const r of responses) {
    if (r instanceof Error) fn.mockRejectedValueOnce(r);
    else fn.mockResolvedValueOnce(r);
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

async function captureError(promise: Promise<unknown>): Promise<ProductsApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ProductsApiError;
  }
  throw new Error("Era esperado um erro da API.");
}

function product(overrides: Partial<Product>): Product {
  return {
    id: "x",
    name: "Produto",
    description: null,
    price: 10,
    active: true,
    featured: false,
    categoryId: null,
    category: null,
    images: [],
    variants: [],
    ...overrides,
  };
}

describe("Serviço de API de produtos e categorias (Task #149 / PBI #92)", () => {
  beforeEach(() => {
    seedDemoAdminSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    clearAdminSession();
  });

  describe("leitura", () => {
    it("lista produtos do painel com o token da sessão e converte o preço para número", async () => {
      const fetchMock = mockFetch(jsonResponse([API_PRODUCT]));

      const result = await getAdminProducts();

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/products",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer demo-jwt-token-menina-mulher",
          }),
        })
      );
      expect(result.demo).toBe(false);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].price).toBe(119.9);
      expect(result.data[0].category?.name).toBe("Sutiãs");
    });

    it("consulta um produto do painel pelo id", async () => {
      const fetchMock = mockFetch(jsonResponse(API_PRODUCT));

      const result = await getAdminProductById("p1");

      expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/products/p1");
      expect(result.data.name).toBe("Sutiã Renda Noir");
    });

    it("lista as categorias da API", async () => {
      mockFetch(jsonResponse([{ id: "c1", name: "Sutiãs", slug: "sutias" }]));

      const result = await getCategories();

      expect(result.demo).toBe(false);
      expect(result.data).toEqual([{ id: "c1", name: "Sutiãs", slug: "sutias" }]);
    });
  });

  describe("mutações", () => {
    it("cadastra produto enviando os dados normalizados", async () => {
      const fetchMock = mockFetch(jsonResponse(API_PRODUCT, 201));

      const created = await createProduct({
        name: "  Sutiã Renda Noir  ",
        description: "  Renda francesa ",
        price: 119.9,
        categoryId: "c1",
        featured: true,
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/products");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({
        name: "Sutiã Renda Noir",
        description: "Renda francesa",
        price: 119.9,
        categoryId: "c1",
        featured: true,
      });
      expect(created.price).toBe(119.9);
    });

    it("edita produto com PATCH enviando só os campos informados", async () => {
      const fetchMock = mockFetch(jsonResponse({ ...API_PRODUCT, price: "99.9" }));

      const updated = await updateProduct("p1", { price: 99.9 });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/products/p1");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ price: 99.9 });
      expect(updated.price).toBe(99.9);
    });

    it("oculta e reativa produto enviando { active }", async () => {
      const fetchMock = mockFetch(jsonResponse({ ...API_PRODUCT, active: false }));

      const hidden = await toggleProductActive("p1", false);

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ active: false });
      expect(hidden.active).toBe(false);
    });

    it("exclui produto com DELETE", async () => {
      const fetchMock = mockFetch(jsonResponse({ message: "Produto excluído com sucesso." }));

      await deleteProduct("p1");

      expect(fetchMock.mock.calls[0][0]).toBe("/api/products/p1");
      expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    });
  });

  describe("erros da API", () => {
    it("repassa a mensagem do 409 ao excluir produto com pedidos vinculados", async () => {
      const message =
        "Não é possível excluir fisicamente um produto que já possui pedidos vinculados.";
      mockFetch(jsonResponse({ error: message }, 409));

      const error = await captureError(deleteProduct("p1"));

      expect(error).toBeInstanceOf(ProductsApiError);
      expect(error.code).toBe("CONFLICT");
      expect(error.status).toBe(409);
      expect(error.message).toBe(message);
    });

    it("repassa as mensagens de validação (400) e de não encontrado (404)", async () => {
      mockFetch(
        jsonResponse({ error: "O nome do produto é obrigatório." }, 400),
        jsonResponse({ error: "Produto não encontrado." }, 404)
      );

      const validation = await captureError(
        createProduct({ name: "", price: 10, categoryId: "c1" })
      );
      const notFound = await captureError(getAdminProductById("nao-existe"));

      expect(validation.code).toBe("VALIDATION");
      expect(validation.message).toBe("O nome do produto é obrigatório.");
      expect(notFound.code).toBe("NOT_FOUND");
      expect(notFound.message).toBe("Produto não encontrado.");
    });

    it("encerra a sessão quando a API responde 401", async () => {
      mockFetch(jsonResponse({ error: "Token inválido ou expirado." }, 401));

      const error = await captureError(getAdminProducts());

      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toBe("Sua sessão expirou. Entre novamente.");
      expect(getAdminSession()).toBeNull();
    });

    it("não trata erro 500 com mensagem da API como API offline", async () => {
      mockFetch(jsonResponse({ error: "Erro ao listar produtos no painel administrativo." }, 500));

      const error = await captureError(getAdminProducts());

      expect(error.code).toBe("UNKNOWN");
      expect(error.message).toBe("Erro ao listar produtos no painel administrativo.");
    });
  });

  describe("API offline", () => {
    it("em desenvolvimento, usa o catálogo de demonstração na leitura e sinaliza demo", async () => {
      vi.stubEnv("DEV", true);
      mockFetch(new TypeError("Failed to fetch"), new Response("", { status: 500 }));

      const products = await getAdminProducts();
      const categories = await getCategories();

      expect(products.demo).toBe(true);
      expect(products.data).toEqual(DEMO_PRODUCTS);
      expect(categories.demo).toBe(true);
      expect(categories.data).toEqual(DEMO_CATEGORIES);
    });

    it("em desenvolvimento, bloqueia mutações em modo demonstração", async () => {
      vi.stubEnv("DEV", true);
      mockFetch(new TypeError("Failed to fetch"));

      const error = await captureError(toggleProductActive("p1", false));

      expect(error.code).toBe("DEMO_READ_ONLY");
      expect(error.message).toMatch(/modo demonstração/i);
    });

    it("em produção, não usa dados de demonstração e informa falha de conexão", async () => {
      vi.stubEnv("DEV", false);
      mockFetch(new TypeError("Failed to fetch"));

      const error = await captureError(getAdminProducts());

      expect(error.code).toBe("OFFLINE");
      expect(error.message).toMatch(/não foi possível conectar/i);
    });
  });

  describe("utilitários", () => {
    it("converte preço digitado no formato brasileiro", () => {
      expect(parsePriceInput("119,90")).toBe(119.9);
      expect(parsePriceInput("R$ 1.234,56")).toBe(1234.56);
      expect(parsePriceInput(" 45 ")).toBe(45);
      expect(parsePriceInput("99.9")).toBe(99.9);
      expect(Number.isNaN(parsePriceInput(""))).toBe(true);
      expect(Number.isNaN(parsePriceInput("abc"))).toBe(true);
    });

    it("formata preço em reais", () => {
      expect(formatPriceBRL(119.9).replace(/\s/g, " ")).toBe("R$ 119,90");
    });

    it("soma o estoque total das variações", () => {
      expect(getTotalStock(product({ variants: API_PRODUCT.variants }))).toBe(5);
      expect(getTotalStock(product({ variants: [] }))).toBe(0);
    });

    it("filtra e conta produtos por status e busca", () => {
      const list = [
        product({ id: "a", name: "Sutiã Noir", active: true, featured: true }),
        product({ id: "b", name: "Calcinha Rosa", active: true }),
        product({ id: "c", name: "Body Velvet", active: false, featured: true }),
      ];

      expect(filterProducts(list, { status: "all" }).map((p) => p.id)).toEqual(["a", "b", "c"]);
      expect(filterProducts(list, { status: "active" }).map((p) => p.id)).toEqual(["a", "b"]);
      expect(filterProducts(list, { status: "hidden" }).map((p) => p.id)).toEqual(["c"]);
      expect(filterProducts(list, { status: "featured" }).map((p) => p.id)).toEqual(["a", "c"]);
      expect(filterProducts(list, { search: "  sutiã " }).map((p) => p.id)).toEqual(["a"]);
      expect(countProductsByStatus(list)).toEqual({ all: 3, active: 2, hidden: 1, featured: 2 });
    });
  });
});
