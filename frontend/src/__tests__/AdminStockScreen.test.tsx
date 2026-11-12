import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import { clearAdminSession, seedDemoAdminSession } from "../services/authApi";
import type { Product } from "../services/productsApi";
import {
  buildVariantSku,
  clampNonNegativeStock,
  exportStockCsv,
  INITIAL_STOCK_GROUPS,
  normalizeVariantColor,
  normalizeVariantSize,
} from "../services/stockApi";

const API_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Sutiã Renda Noir",
    description: null,
    price: 119.9,
    active: true,
    featured: true,
    categoryId: "cat-1",
    category: { id: "cat-1", name: "Sutiãs", slug: "sutias" },
    images: [],
    variants: [
      { id: "var-1", size: "P", color: "Preto", stock: 3 },
      { id: "var-2", size: "M", color: "Preto", stock: 2 },
      { id: "var-3", size: "G", color: "Preto", stock: 0 },
      { id: "var-4", size: "M", color: "Nude Areia", stock: 5 },
    ],
  },
  {
    id: "prod-2",
    name: "Conjunto Novo Sem Grade",
    description: null,
    price: 159.9,
    active: true,
    featured: false,
    categoryId: "cat-2",
    category: { id: "cat-2", name: "Conjuntos", slug: "conjuntos" },
    images: [],
    variants: [],
  },
];

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderStockPage() {
  return render(
    <MemoryRouter initialEntries={["/painel/estoque"]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("Gestão de Variações e Ajuste de Estoque (PBI #96 / Issue #181)", () => {
  beforeEach(() => {
    seedDemoAdminSession();
  });

  afterEach(() => {
    cleanup();
    clearAdminSession();
    vi.unstubAllGlobals();
  });

  it("normaliza tamanho e cor, gera SKU e impede estoque negativo no stockApi (RNF09)", () => {
    expect(normalizeVariantSize(" gg ")).toBe("GG");
    expect(normalizeVariantColor("  Rosa Pétala  ")).toBe("Rosa Pétala");
    expect(clampNonNegativeStock(-5)).toBe(0);
    expect(clampNonNegativeStock(4.8)).toBe(4);
    expect(buildVariantSku("SRN-2024", "Preto", "p")).toBe("SRN-PR-P");

    const csv = exportStockCsv(INITIAL_STOCK_GROUPS);
    expect(csv).toContain("Produto,Codigo,Categoria,SKU,Tamanho,Cor,Quantidade,Status");
    expect(csv).toContain('"Sutiã Renda Noir","SRN-2024"');
  });

  it("carrega produtos reais da API (incluindo produto sem variações) e exibe botões >= 44px (RNF07)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(API_PRODUCTS));
    vi.stubGlobal("fetch", fetchMock);

    renderStockPage();

    expect(await screen.findByText("Sutiã Renda Noir")).toBeDefined();
    expect(screen.getByText("Conjunto Novo Sem Grade")).toBeDefined();
    expect(screen.getByText("10 peças")).toBeDefined();
    expect(screen.getByText("4 variações ativas cadastradas")).toBeDefined();

    // Verifica chamada autenticada a /api/admin/products
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/products");

    const decreaseBtn = screen.getByRole("button", {
      name: "Diminuir estoque de P · Preto",
    });
    const increaseBtn = screen.getByRole("button", {
      name: "Aumentar estoque de P · Preto",
    });

    expect(decreaseBtn.className).toContain("min-w-11");
    expect(decreaseBtn.className).toContain("min-h-11");
    expect(increaseBtn.className).toContain("min-w-11");
    expect(increaseBtn.className).toContain("min-h-11");
  });

  it("ajusta saldo (+1 e -1) enviando token Bearer e faz rollback se a API falhar (RNF09)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(API_PRODUCTS))
      .mockResolvedValueOnce(
        jsonResponse({ id: "var-1", productId: "prod-1", size: "P", color: "Preto", stock: 4 })
      )
      .mockResolvedValueOnce(jsonResponse({ error: "Erro interno no servidor." }, 500));
    vi.stubGlobal("fetch", fetchMock);

    renderStockPage();

    const qtyDisplay = await screen.findByTestId("qty-SRN-PR-P");
    expect(qtyDisplay.textContent).toBe("3");

    const increaseBtn = screen.getByRole("button", {
      name: "Aumentar estoque de P · Preto",
    });
    fireEvent.click(increaseBtn);

    await waitFor(() => {
      expect(qtyDisplay.textContent).toBe("4");
      expect(screen.getByText(/Salvo e sincronizado na vitrine da loja/i)).toBeDefined();
    });

    // Verifica envio de Authorization Bearer na chamada PATCH
    const [, patchInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(patchInit.method).toBe("PATCH");
    expect((patchInit.headers as Record<string, string>).Authorization).toMatch(/^Bearer /);

    // Próxima chamada retorna 500 -> deve fazer rollback para 4 e exibir banner de erro sem banner de sucesso
    const decreaseBtn = screen.getByRole("button", {
      name: "Diminuir estoque de P · Preto",
    });
    fireEvent.click(decreaseBtn);

    await waitFor(() => {
      expect(qtyDisplay.textContent).toBe("4");
      expect(screen.getByText("Erro interno no servidor.")).toBeDefined();
      expect(screen.queryByText(/Salvo e sincronizado na vitrine da loja/i)).toBeNull();
    });

    // Variação G · Preto começa com 0 unidades e o botão "-" deve estar desabilitado
    const zeroQtyDisplay = screen.getByTestId("qty-SRN-PR-G");
    expect(zeroQtyDisplay.textContent).toBe("0");
    const zeroDecreaseBtn = screen.getByRole("button", {
      name: "Diminuir estoque de G · Preto",
    });
    expect(zeroDecreaseBtn.hasAttribute("disabled")).toBe(true);
  });

  it("lista produto recém-criado no modal de Entrada de Lote, cadastra variação e bloqueia duplicidade", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(API_PRODUCTS))
      .mockResolvedValueOnce(
        jsonResponse(
          { id: "var-new-99", productId: "prod-2", size: "GG", color: "Vinho", stock: 6 },
          201
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    renderStockPage();
    await screen.findByText("Conjunto Novo Sem Grade");

    fireEvent.click(screen.getByRole("button", { name: /Entrada de Lote \/ Reposição/i }));
    const dialog = screen.getByRole("dialog");

    const productSelect = within(dialog).getByLabelText(/Peça do Catálogo/i) as HTMLSelectElement;
    expect(within(productSelect).getByText(/Conjunto Novo Sem Grade/i)).toBeDefined();

    // Tenta duplicar P · Preto em Sutiã Renda Noir
    const sizeInput = within(dialog).getByLabelText(/Tamanho \(P, M, G, GG, ÚNICO\)/i);
    const colorInput = within(dialog).getByLabelText(/Cor da Peça/i);
    const qtyInput = within(dialog).getByLabelText(/Quantidade Inicial em Estoque/i);

    fireEvent.change(sizeInput, { target: { value: "p" } });
    fireEvent.change(colorInput, { target: { value: "Preto" } });
    fireEvent.change(qtyInput, { target: { value: "4" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Salvar Variação/i }));

    expect(
      within(dialog).getByText(/Já existe uma variação cadastrada com tamanho "P" e cor "Preto"/i)
    ).toBeDefined();

    // Seleciona o produto recém-criado (Conjunto Novo Sem Grade) e cadastra GG · Vinho
    fireEvent.change(productSelect, { target: { value: "prod-2" } });
    fireEvent.change(sizeInput, { target: { value: "gg" } });
    fireEvent.change(colorInput, { target: { value: "Vinho" } });
    fireEvent.change(qtyInput, { target: { value: "6" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Salvar Variação/i }));

    // Não deve disparar novo GET ao trocar produto no select (1 GET inicial + 1 POST)
    await waitFor(() => {
      expect(screen.getByText("GG · Vinho")).toBeDefined();
      expect(screen.getByText("16 peças")).toBeDefined();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/products/prod-2/variants");
  });

  it("edita variação existente, faz rollback em conflito 409 na exclusão e exclui quando permitido", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(API_PRODUCTS))
      .mockResolvedValueOnce(
        jsonResponse({ id: "var-4", productId: "prod-1", size: "M", color: "Nude Areia", stock: 9 })
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: "Não é possível excluir variação vinculada a pedidos." }, 409)
      )
      .mockResolvedValueOnce(jsonResponse({ message: "Variação removida com sucesso." }));
    vi.stubGlobal("fetch", fetchMock);

    renderStockPage();
    await screen.findByText("Sutiã Renda Noir");

    // Edita variação M · Nude Areia
    fireEvent.click(screen.getByRole("button", { name: "Editar variação M · Nude Areia" }));
    const editDialog = screen.getByRole("dialog");

    const stockInput = within(editDialog).getByLabelText(/Saldo em Estoque \(unidades\)/i);
    fireEvent.change(stockInput, { target: { value: "9" } });
    fireEvent.click(within(editDialog).getByRole("button", { name: /Salvar Alterações/i }));

    await waitFor(() => {
      expect(screen.getByTestId("qty-SRN-NU-M").textContent).toBe("9");
    });

    // Tenta excluir P · Preto -> API retorna 409 Conflict -> deve fazer rollback e manter na tela
    fireEvent.click(screen.getByRole("button", { name: "Remover variação P · Preto" }));

    await waitFor(() => {
      expect(screen.getByText(/Ação Bloqueada por Integridade de Pedidos/i)).toBeDefined();
      expect(screen.getByTestId("qty-SRN-PR-P")).toBeDefined();
    });

    // Exclui G · Preto -> API retorna 200 -> deve remover da lista
    fireEvent.click(screen.getByRole("button", { name: "Remover variação G · Preto" }));

    await waitFor(() => {
      expect(screen.queryByTestId("qty-SRN-PR-G")).toBeNull();
    });
  });

  it("filtra variações por status (Baixo Estoque / Esgotadas) e exibe EmptyState quando não há resultados", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(API_PRODUCTS));
    vi.stubGlobal("fetch", fetchMock);

    renderStockPage();
    await screen.findByText("Sutiã Renda Noir");

    fireEvent.click(screen.getByRole("button", { name: /Esgotadas \(1\)/i }));
    expect(screen.getByText("G · Preto")).toBeDefined();
    expect(screen.queryByText("P · Preto")).toBeNull();
    expect(screen.queryByText("Conjunto Novo Sem Grade")).toBeNull();

    const searchInput = screen.getByLabelText(/Buscar por peça, cor, SKU ou tamanho/i);
    fireEvent.change(searchInput, { target: { value: "inexistente-xyz" } });

    expect(screen.getByText(/Nenhuma variação encontrada/i)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Limpar Filtros/i }));
    expect(screen.getByText("P · Preto")).toBeDefined();
    expect(screen.getByText("Conjunto Novo Sem Grade")).toBeDefined();
  });

  it("redireciona para /painel/login quando a API retornar 401 Unauthorized em mutação", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(API_PRODUCTS))
      .mockResolvedValueOnce(jsonResponse({ error: "Token inválido ou expirado." }, 401));
    vi.stubGlobal("fetch", fetchMock);

    renderStockPage();
    await screen.findByText("Sutiã Renda Noir");

    fireEvent.click(screen.getByRole("button", { name: "Aumentar estoque de P · Preto" }));

    expect(
      await screen.findByRole("heading", { name: /Boas-vindas ao Painel de Gestão/i })
    ).toBeDefined();
  });
});
