import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import { clearAdminSession, seedDemoAdminSession } from "../services/authApi";
import {
  buildVariantSku,
  clampNonNegativeStock,
  exportStockCsv,
  INITIAL_STOCK_GROUPS,
  normalizeVariantColor,
  normalizeVariantSize,
} from "../services/stockApi";

function renderStockPage() {
  return render(
    <MemoryRouter initialEntries={["/painel/estoque"]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("Gestão de Variações e Ajuste de Estoque (PBI #96)", () => {
  beforeEach(() => {
    seedDemoAdminSession();
  });

  afterEach(() => {
    cleanup();
    clearAdminSession();
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

  it("renderiza indicadores dinâmicos, produtos e variações com botões acessíveis >= 44px (RNF07)", () => {
    renderStockPage();

    expect(screen.getByRole("heading", { name: "Controle de Estoque" })).toBeDefined();
    expect(screen.getByText("28 peças")).toBeDefined();
    expect(screen.getByText("10 variações ativas cadastradas")).toBeDefined();

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

  it("ajusta rapidamente o saldo (+1 e -1) e bloqueia saldo negativo quando estoque é 0 (RNF09)", () => {
    renderStockPage();

    const qtyDisplay = screen.getByTestId("qty-SN-PR-P");
    expect(qtyDisplay.textContent).toBe("3");

    const increaseBtn = screen.getByRole("button", {
      name: "Aumentar estoque de P · Preto",
    });
    fireEvent.click(increaseBtn);
    expect(qtyDisplay.textContent).toBe("4");

    const decreaseBtn = screen.getByRole("button", {
      name: "Diminuir estoque de P · Preto",
    });
    fireEvent.click(decreaseBtn);
    expect(qtyDisplay.textContent).toBe("3");

    // Variação G · Preto começa com 0 unidades e o botão "-" deve estar desabilitado
    const zeroQtyDisplay = screen.getByTestId("qty-SN-PR-G");
    expect(zeroQtyDisplay.textContent).toBe("0");
    const zeroDecreaseBtn = screen.getByRole("button", {
      name: "Diminuir estoque de G · Preto",
    });
    expect(zeroDecreaseBtn.hasAttribute("disabled")).toBe(true);
  });

  it("cadastra nova variação pelo modal normalizando tamanho em UPPERCASE e bloqueia duplicidade", () => {
    renderStockPage();

    fireEvent.click(screen.getByRole("button", { name: /Entrada de Lote \/ Reposição/i }));
    const dialog = screen.getByRole("dialog");

    const sizeInput = within(dialog).getByLabelText(/Tamanho \(P, M, G, GG, ÚNICO\)/i);
    const colorInput = within(dialog).getByLabelText(/Cor da Peça/i);
    const qtyInput = within(dialog).getByLabelText(/Quantidade Inicial em Estoque/i);

    // Tentativa duplicada: P · Preto já existe em Sutiã Renda Noir
    fireEvent.change(sizeInput, { target: { value: "p" } });
    fireEvent.change(colorInput, { target: { value: "Preto" } });
    fireEvent.change(qtyInput, { target: { value: "4" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Salvar Variação/i }));

    expect(
      within(dialog).getByText(/Já existe uma variação cadastrada com tamanho "P" e cor "Preto"/i)
    ).toBeDefined();

    // Cadastro válido: GG · Vinho
    fireEvent.change(sizeInput, { target: { value: "gg" } });
    fireEvent.change(colorInput, { target: { value: "Vinho" } });
    fireEvent.change(qtyInput, { target: { value: "6" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Salvar Variação/i }));

    expect(screen.getByText("GG · Vinho")).toBeDefined();
    expect(screen.getByText("34 peças")).toBeDefined();
  });

  it("edita variação existente e impede exclusão de variação vinculada a pedidos", () => {
    renderStockPage();

    // Edita variação M · Nude Areia (sem pedidos)
    fireEvent.click(screen.getByRole("button", { name: "Editar variação M · Nude Areia" }));
    const editDialog = screen.getByRole("dialog");

    const stockInput = within(editDialog).getByLabelText(/Saldo em Estoque \(unidades\)/i);
    fireEvent.change(stockInput, { target: { value: "9" } });
    fireEvent.click(within(editDialog).getByRole("button", { name: /Salvar Alterações/i }));

    expect(screen.getByTestId("qty-SN-NU-M").textContent).toBe("9");

    // Tenta excluir P · Preto (possui pedidos vinculados -> deve exibir alerta de integridade)
    fireEvent.click(screen.getByRole("button", { name: "Remover variação P · Preto" }));
    expect(screen.getByText(/Ação Bloqueada por Integridade de Pedidos/i)).toBeDefined();

    // Exclui G · Preto (sem pedidos vinculados -> deve remover da lista)
    fireEvent.click(screen.getByRole("button", { name: "Remover variação G · Preto" }));
    expect(screen.queryByTestId("qty-SN-PR-G")).toBeNull();
  });

  it("filtra variações por status (Baixo Estoque / Esgotadas) e exibe EmptyState quando não há resultados", () => {
    renderStockPage();

    fireEvent.click(screen.getByRole("button", { name: /Esgotadas \(3\)/i }));
    expect(screen.getByText("G · Preto")).toBeDefined();
    expect(screen.queryByText("P · Preto")).toBeNull();

    const searchInput = screen.getByLabelText(/Buscar por peça, cor, SKU ou tamanho/i);
    fireEvent.change(searchInput, { target: { value: "inexistente-xyz" } });

    expect(screen.getByText(/Nenhuma variação encontrada/i)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Limpar Filtros/i }));
    expect(screen.getByText("P · Preto")).toBeDefined();
  });
});
