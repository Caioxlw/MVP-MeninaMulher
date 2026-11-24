import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAdminSession, getAdminSession, seedDemoAdminSession } from "../services/authApi";
import {
  type AdminOrder,
  OrdersApiError,
  formatOrderDateTime,
  formatOrderNumber,
  getAdminOrders,
  getOrderStatusMeta,
  sortOrdersNewestFirst,
} from "../services/ordersApi";

const API_ORDER_OLDER = {
  id: "ord-1",
  orderNumber: 1,
  status: "PENDING" as const,
  totalAmount: "159.8",
  createdAt: "2026-11-18T10:15:00.000Z",
  updatedAt: "2026-11-18T10:15:00.000Z",
  items: [
    {
      id: "item-1",
      variantId: "var-1",
      quantity: 1,
      unitPrice: "119.9",
      size: "M",
      color: "Preto",
      productName: "Sutiã Renda Noir",
    },
    {
      id: "item-2",
      variantId: "var-2",
      quantity: 1,
      unitPrice: 39.9,
      size: "P",
      color: "Nude",
      productName: "Calcinha Algodão Doce",
    },
  ],
};

const API_ORDER_NEWER = {
  id: "ord-2",
  orderNumber: 42,
  status: "CONFIRMED" as const,
  totalAmount: 249.8,
  createdAt: "2026-11-20T14:30:00.000Z",
  updatedAt: "2026-11-20T14:35:00.000Z",
  items: [
    {
      id: "item-3",
      variantId: "var-3",
      quantity: 2,
      unitPrice: "124.9",
      size: "G",
      color: "Vinho",
      productName: "Baby Doll Cetim Vinho",
    },
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

async function captureError(promise: Promise<unknown>): Promise<OrdersApiError> {
  try {
    await promise;
  } catch (error) {
    return error as OrdersApiError;
  }
  throw new Error("Era esperado um OrdersApiError.");
}

describe("Serviço de pedidos administrativos — ordersApi (Task #221 / PBI #30)", () => {
  beforeEach(() => {
    seedDemoAdminSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    clearAdminSession();
  });

  describe("listagem, autenticação e query string", () => {
    it("envia Authorization Bearer token para /api/admin/orders e normaliza valores numéricos e ordenação", async () => {
      const fetchMock = mockFetch(
        jsonResponse({
          data: [API_ORDER_OLDER, API_ORDER_NEWER],
          meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
        })
      );

      const result = await getAdminOrders();

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer demo-jwt-token-menina-mulher",
          }),
        })
      );
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
      expect(result.data).toHaveLength(2);
      // Mais recente primeiro (ord-2 antes de ord-1)
      expect(result.data[0].id).toBe("ord-2");
      expect(result.data[1].id).toBe("ord-1");
      expect(result.data[0].totalAmount).toBe(249.8);
      expect(result.data[1].totalAmount).toBe(159.8);
      expect(result.data[0].items[0].unitPrice).toBe(124.9);
      expect(result.data[1].items[0].unitPrice).toBe(119.9);
    });

    it("monta query string com status opcional e paginação (page, limit)", async () => {
      const fetchMock = mockFetch(
        jsonResponse({
          data: [API_ORDER_OLDER],
          meta: { page: 2, limit: 10, total: 11, totalPages: 2 },
        })
      );

      await getAdminOrders({ status: "PENDING", page: 2, limit: 10 });

      expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/orders?status=PENDING&page=2&limit=10");
    });

    it("não inclui status na query string quando status é omitido ou ALL", async () => {
      const fetchMock = mockFetch(
        jsonResponse({
          data: [],
          meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        })
      );

      await getAdminOrders({ page: 1, limit: 20 });

      expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/orders?page=1&limit=20");
    });

    it("não expõe nem repassa dados pessoais da cliente no retorno normalizado (RNF06)", async () => {
      mockFetch(
        jsonResponse({
          data: [
            {
              ...API_ORDER_OLDER,
              customerName: "Mariana Silva",
              phone: "11999999999",
              address: "Rua Exemplo, 123",
              email: "mariana@example.com",
            },
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        })
      );

      const result = await getAdminOrders();
      const order = result.data[0] as unknown as Record<string, unknown>;

      expect(order).not.toHaveProperty("customerName");
      expect(order).not.toHaveProperty("phone");
      expect(order).not.toHaveProperty("address");
      expect(order).not.toHaveProperty("email");
      expect(Object.keys(order).sort()).toEqual([
        "createdAt",
        "id",
        "items",
        "orderNumber",
        "status",
        "totalAmount",
        "updatedAt",
      ]);
    });
  });

  describe("tratamento de erros sem fallback demo", () => {
    it("limpa a sessão e lança OrdersApiError UNAUTHORIZED em resposta 401", async () => {
      mockFetch(jsonResponse({ error: "Token inválido" }, 401));

      const error = await captureError(getAdminOrders());

      expect(error).toBeInstanceOf(OrdersApiError);
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.status).toBe(401);
      expect(getAdminSession()).toBeNull();
    });

    it("limpa a sessão e lança OrdersApiError UNAUTHORIZED em resposta 403", async () => {
      mockFetch(jsonResponse({ error: "Acesso negado" }, 403));

      const error = await captureError(getAdminOrders());

      expect(error).toBeInstanceOf(OrdersApiError);
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.status).toBe(403);
      expect(getAdminSession()).toBeNull();
    });

    it("propaga mensagem da API com código VALIDATION em resposta 400", async () => {
      mockFetch(jsonResponse({ error: "Filtro de status inválido" }, 400));

      const error = await captureError(getAdminOrders());

      expect(error).toBeInstanceOf(OrdersApiError);
      expect(error.code).toBe("VALIDATION");
      expect(error.status).toBe(400);
      expect(error.message).toBe("Filtro de status inválido");
    });

    it("lança OrdersApiError OFFLINE em falha de rede mesmo em DEV (sem fallback demo)", async () => {
      vi.stubEnv("DEV", true);
      mockFetch(new TypeError("Failed to fetch"));

      const error = await captureError(getAdminOrders());

      expect(error).toBeInstanceOf(OrdersApiError);
      expect(error.code).toBe("OFFLINE");
    });

    it("lança OrdersApiError OFFLINE em resposta 500 sem fallback demo", async () => {
      vi.stubEnv("DEV", true);
      mockFetch(jsonResponse({ error: "Erro interno" }, 500));

      const error = await captureError(getAdminOrders());

      expect(error).toBeInstanceOf(OrdersApiError);
      expect(error.code).toBe("OFFLINE");
      expect(error.status).toBe(500);
    });

    it("lança OrdersApiError UNKNOWN quando o payload não possui array data", async () => {
      mockFetch(jsonResponse({ unexpected: true }, 200));

      const error = await captureError(getAdminOrders());

      expect(error).toBeInstanceOf(OrdersApiError);
      expect(error.code).toBe("UNKNOWN");
    });
  });

  describe("helpers puros", () => {
    it("formatOrderNumber formata com zero à esquerda em 4 dígitos e trata valores inválidos", () => {
      expect(formatOrderNumber(1)).toBe("#0001");
      expect(formatOrderNumber(42)).toBe("#0042");
      expect(formatOrderNumber(12345)).toBe("#12345");
      expect(formatOrderNumber(Number.NaN)).toBe("#0000");
      expect(formatOrderNumber(-5)).toBe("#0000");
    });

    it("ignora page e limit inválidos (<= 0 ou NaN) na query string", async () => {
      const fetchMock = mockFetch(jsonResponse({ data: [] }));

      await getAdminOrders({ page: 0, limit: Number.NaN });

      expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/orders");
    });

    it("formatOrderDateTime formata ISO date em pt-BR e trata data inválida", () => {
      const formatted = formatOrderDateTime("2026-11-20T14:30:00.000Z");
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(formatOrderDateTime("data-invalida")).toBe("—");
    });

    it("getOrderStatusMeta retorna rótulo e variante corretos para cada status", () => {
      expect(getOrderStatusMeta("PENDING")).toEqual({
        label: "Pendente",
        variant: "lowStock",
      });
      expect(getOrderStatusMeta("CONFIRMED")).toEqual({
        label: "Confirmado",
        variant: "available",
      });
      expect(getOrderStatusMeta("CANCELLED")).toEqual({
        label: "Cancelado",
        variant: "outOfStock",
      });
      expect(getOrderStatusMeta("UNKNOWN" as AdminOrder["status"])).toEqual({
        label: "UNKNOWN",
        variant: "neutral",
      });
    });

    it("sortOrdersNewestFirst ordena do mais recente para o mais antigo sem mutar o array original e tolera datas inválidas", () => {
      const input: AdminOrder[] = [
        { ...API_ORDER_OLDER, totalAmount: 159.8, items: [] },
        {
          ...API_ORDER_NEWER,
          id: "ord-invalid",
          createdAt: "invalid-date",
          totalAmount: 10,
          items: [],
        },
        { ...API_ORDER_NEWER, totalAmount: 249.8, items: [] },
      ];

      const sorted = sortOrdersNewestFirst(input);

      expect(sorted.map((o) => o.id)).toEqual(["ord-2", "ord-1", "ord-invalid"]);
      expect(input.map((o) => o.id)).toEqual(["ord-1", "ord-invalid", "ord-2"]);
    });

    it("calcula totalPages como 0 em lista vazia quando meta é omitido", async () => {
      mockFetch(jsonResponse({ data: [] }));

      const result = await getAdminOrders();

      expect(result.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });
  });
});
