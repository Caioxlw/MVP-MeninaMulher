import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminOrdersScreen } from "../pages/admin/AdminOrdersScreen";
import { AppRoutes } from "../routes/AppRoutes";
import { ADMIN_ROUTE_DESCRIPTORS, ROUTES } from "../routes/routes.config";
import { clearAdminSession, isAdminAuthenticated, seedDemoAdminSession } from "../services/authApi";
import { formatOrderDateTime } from "../services/ordersApi";

const ORDER_OLDER_PENDING = {
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

const ORDER_NEWER_CONFIRMED = {
  id: "ord-42",
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

const ORDER_CANCELLED = {
  id: "ord-19",
  orderNumber: 19,
  status: "CANCELLED" as const,
  totalAmount: 89.9,
  createdAt: "2026-11-19T09:00:00.000Z",
  updatedAt: "2026-11-19T09:20:00.000Z",
  items: [
    {
      id: "item-4",
      variantId: "var-4",
      quantity: 1,
      unitPrice: 89.9,
      size: "P",
      color: "Rosa Pétala",
      productName: "Body Renda Delicada",
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function paginatedBody(orders: unknown[]) {
  return {
    data: orders,
    meta: {
      page: 1,
      limit: 20,
      total: orders.length,
      totalPages: orders.length === 0 ? 0 : 1,
    },
  };
}

function renderAdminOrdersRoute(initialEntries = [ROUTES.admin.orders]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("AdminOrdersScreen — Listagem e Filtragem de Pedidos no Painel (Issue #222 / PBI #30)", () => {
  beforeEach(() => {
    seedDemoAdminSession();
  });

  afterEach(() => {
    cleanup();
    clearAdminSession();
    vi.unstubAllGlobals();
  });

  it("redireciona para /painel/login quando não há sessão administrativa válida (RNF05)", () => {
    clearAdminSession();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderAdminOrdersRoute();

    expect(screen.getByRole("heading", { name: "Boas-vindas ao Painel de Gestão" })).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("exibe skeleton de carregamento enquanto busca pedidos e mantém o título da página visível", async () => {
    let resolveFetch!: (res: Response) => void;
    const pendingPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pendingPromise));

    renderAdminOrdersRoute();

    expect(screen.getByRole("heading", { name: "Gestão de Pedidos" })).toBeDefined();
    expect(screen.getByRole("status", { name: /Carregando pedidos/i })).toBeDefined();

    resolveFetch(jsonResponse(paginatedBody([ORDER_NEWER_CONFIRMED])));

    await waitFor(() => {
      expect(screen.getByText("#0042")).toBeDefined();
    });
  });

  it("consome GET /api/admin/orders autenticado, ordena do mais recente para o mais antigo e exibe detalhes sem dados pessoais (RF14, RNF06)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(paginatedBody([ORDER_OLDER_PENDING, ORDER_NEWER_CONFIRMED]))
      );
    vi.stubGlobal("fetch", fetchMock);

    renderAdminOrdersRoute();

    await waitFor(() => {
      expect(screen.getByText("#0042")).toBeDefined();
      expect(screen.getByText("#0001")).toBeDefined();
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe("/api/admin/orders");
    expect((requestInit.headers as Record<string, string>).Authorization).toMatch(/^Bearer .+/);

    // Ordenação: mais recente (#0042) antes do mais antigo (#0001)
    const cards = screen.getAllByTestId(/^order-card-/);
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText("#0042")).toBeDefined();
    expect(within(cards[1]).getByText("#0001")).toBeDefined();

    // Dados do pedido #0042: status, data/hora, total e itens
    expect(within(cards[0]).getByText("Confirmado")).toBeDefined();
    expect(
      within(cards[0]).getByText(formatOrderDateTime(ORDER_NEWER_CONFIRMED.createdAt))
    ).toBeDefined();
    expect(within(cards[0]).getAllByText(/R\$\s*249,80/).length).toBeGreaterThanOrEqual(1);
    expect(within(cards[0]).getByText("Baby Doll Cetim Vinho")).toBeDefined();
    expect(within(cards[0]).getByText(/Tam:\s*G/)).toBeDefined();
    expect(within(cards[0]).getByText(/Cor:\s*Vinho/)).toBeDefined();
    expect(within(cards[0]).getByText(/2\s*un\./)).toBeDefined();
    expect(within(cards[0]).getByText(/R\$\s*124,90/)).toBeDefined();

    // Privacidade (RNF06): sem dados pessoais sensíveis do mockup antigo
    expect(screen.queryByText(/Mariana Silva/i)).toBeNull();
    expect(screen.queryByText(/Camila Rocha/i)).toBeNull();
    expect(screen.queryByText(/98765-4321/)).toBeNull();
    expect(screen.queryByText(/Alameda Lorena/i)).toBeNull();
  });

  it("filtra pedidos dinamicamente por status (Todos, Pendentes, Confirmados, Cancelados) com áreas de toque >= 44px (RNF07)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(paginatedBody([ORDER_NEWER_CONFIRMED, ORDER_CANCELLED, ORDER_OLDER_PENDING]))
      )
      .mockResolvedValueOnce(jsonResponse(paginatedBody([ORDER_OLDER_PENDING])))
      .mockResolvedValueOnce(jsonResponse(paginatedBody([ORDER_NEWER_CONFIRMED])))
      .mockResolvedValueOnce(jsonResponse(paginatedBody([ORDER_CANCELLED])))
      .mockResolvedValueOnce(
        jsonResponse(paginatedBody([ORDER_NEWER_CONFIRMED, ORDER_CANCELLED, ORDER_OLDER_PENDING]))
      );
    vi.stubGlobal("fetch", fetchMock);

    renderAdminOrdersRoute();

    await waitFor(() => {
      expect(screen.getByText("#0042")).toBeDefined();
    });

    const allTab = screen.getByRole("button", { name: "Todos" });
    const pendingTab = screen.getByRole("button", { name: "Pendentes" });
    const confirmedTab = screen.getByRole("button", { name: "Confirmados" });
    const cancelledTab = screen.getByRole("button", { name: "Cancelados" });

    for (const tab of [allTab, pendingTab, confirmedTab, cancelledTab]) {
      expect(tab.className).toContain("min-h-11");
    }

    expect(allTab.getAttribute("aria-pressed")).toBe("true");

    // Pendentes
    fireEvent.click(pendingTab);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/orders?status=PENDING", expect.anything());
      expect(screen.getByText("#0001")).toBeDefined();
      expect(screen.queryByText("#0042")).toBeNull();
    });
    expect(pendingTab.getAttribute("aria-pressed")).toBe("true");

    // Confirmados
    fireEvent.click(confirmedTab);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders?status=CONFIRMED",
        expect.anything()
      );
      expect(screen.getByText("#0042")).toBeDefined();
      expect(screen.queryByText("#0001")).toBeNull();
    });

    // Cancelados
    fireEvent.click(cancelledTab);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/orders?status=CANCELLED",
        expect.anything()
      );
      expect(screen.getByText("#0019")).toBeDefined();
    });

    // Voltar para Todos
    fireEvent.click(allTab);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/orders", expect.anything());
      expect(screen.getByText("#0042")).toBeDefined();
      expect(screen.getByText("#0001")).toBeDefined();
    });
  });

  it("exibe empty state contextualizado quando lista ou filtro está vazio e permite limpar filtro", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(paginatedBody([ORDER_NEWER_CONFIRMED])))
      .mockResolvedValueOnce(jsonResponse(paginatedBody([])))
      .mockResolvedValueOnce(jsonResponse(paginatedBody([ORDER_NEWER_CONFIRMED])));
    vi.stubGlobal("fetch", fetchMock);

    renderAdminOrdersRoute();

    await waitFor(() => {
      expect(screen.getByText("#0042")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancelados" }));

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeDefined();
      expect(screen.getByRole("heading", { name: "Nenhum pedido cancelado" })).toBeDefined();
    });

    const resetBtn = screen.getByRole("button", { name: /Ver todos os pedidos/i });
    expect(resetBtn.className).toContain("touch-target");
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText("#0042")).toBeDefined();
    });
  });

  it("exibe erro amigável com botão de tentar novamente e recupera a listagem no retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(paginatedBody([ORDER_OLDER_PENDING])));
    vi.stubGlobal("fetch", fetchMock);

    renderAdminOrdersRoute();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText(/Não foi possível conectar ao servidor/i)).toBeDefined();
    });

    const retryBtn = screen.getByRole("button", { name: /Tentar novamente/i });
    expect(retryBtn.className).toContain("touch-target");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("#0001")).toBeDefined();
    });
  });

  it("redireciona para /painel/login quando a API retorna 401/403 (sessão expirada)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ error: "Token inválido" }, 401))
    );

    renderAdminOrdersRoute();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Boas-vindas ao Painel de Gestão" })
      ).toBeDefined();
    });
    expect(isAdminAuthenticated()).toBe(false);
  });

  it("prepara o container de ações futuras (PBI #98) em cada pedido e suporta renderOrderActions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse(paginatedBody([ORDER_OLDER_PENDING])))
    );

    const ordersDescriptor = ADMIN_ROUTE_DESCRIPTORS.find((d) => d.path === ROUTES.admin.orders)!;

    render(
      <MemoryRouter initialEntries={[ROUTES.admin.orders]}>
        <AdminOrdersScreen
          descriptor={ordersDescriptor}
          renderOrderActions={(order) => (
            <button type="button" data-testid={`custom-action-${order.id}`}>
              Confirmar {order.orderNumber}
            </button>
          )}
        />
      </MemoryRouter>
    );

    const actionsContainer = await screen.findByTestId("order-actions-ord-1");
    expect(actionsContainer).toBeDefined();
    expect(within(actionsContainer).getByTestId("custom-action-ord-1")).toBeDefined();
  });
});
