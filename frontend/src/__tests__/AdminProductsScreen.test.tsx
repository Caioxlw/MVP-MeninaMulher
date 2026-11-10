import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import { clearAdminSession, seedDemoAdminSession } from "../services/authApi";
import { resetDemoProductsStore } from "../services/productsApi";

function renderAdminProductsPage(initialEntries = ["/painel/produtos"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("AdminProductsScreen - Gestão de Produtos no Painel (PBI #92 / Task #151)", () => {
  beforeEach(() => {
    seedDemoAdminSession();
    resetDemoProductsStore();
  });

  afterEach(() => {
    cleanup();
    clearAdminSession();
    resetDemoProductsStore();
  });

  it("renderiza a listagem de produtos com cabeçalho, contadores de status e botão de cadastrar (RNF07)", async () => {
    renderAdminProductsPage();

    expect(
      await screen.findByRole("heading", { name: "Catálogo e Cadastro de Produtos" })
    ).toBeDefined();
    expect(
      screen.getByText("Gerencie peças, fotos, preços e visibilidade na vitrine virtual.")
    ).toBeDefined();

    // Botão de novo produto
    const newProductBtn = screen.getByRole("button", { name: /Cadastrar Novo Produto/i });
    expect(newProductBtn).toBeDefined();
    expect(newProductBtn.className).toContain("touch-target");

    // Abas de filtros de status
    expect(screen.getByRole("button", { name: /Todos/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Ativos/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Ocultos/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Destaques/i })).toBeDefined();

    // Produtos mockados iniciais presentes
    expect(screen.getByText("Sutiã Renda Noir")).toBeDefined();
    expect(screen.getByText("Calcinha Algodão Doce")).toBeDefined();
    expect(screen.getByText("Conjunto Microfibra Nude")).toBeDefined();
    expect(screen.getByText("Baby Doll Cetim Vinho")).toBeDefined();
  });

  it("filtra produtos por busca textual de nome e exibe EmptyState quando não houver resultado", async () => {
    renderAdminProductsPage();

    const searchInput = await screen.findByPlaceholderText(/Buscar por nome da lingerie.../i);
    expect(searchInput).toBeDefined();

    // Filtrar por termo existente
    fireEvent.change(searchInput, { target: { value: "Noir" } });
    expect(screen.getByText("Sutiã Renda Noir")).toBeDefined();
    expect(screen.queryByText("Calcinha Algodão Doce")).toBeNull();

    // Filtrar por termo inexistente
    fireEvent.change(searchInput, { target: { value: "InexistenteXYZ" } });
    expect(screen.getByText("Nenhum produto encontrado")).toBeDefined();

    // Limpar filtros pelo botão do EmptyState
    const clearBtn = screen.getByRole("button", { name: "Limpar Filtros" });
    fireEvent.click(clearBtn);
    expect(screen.getByText("Sutiã Renda Noir")).toBeDefined();
    expect(screen.getByText("Calcinha Algodão Doce")).toBeDefined();
  });

  it("filtra produtos pelas abas de status (Ativos, Ocultos e Destaques)", async () => {
    renderAdminProductsPage();

    await screen.findByRole("heading", { name: "Catálogo e Cadastro de Produtos" });

    // Filtrar Ocultos
    const hiddenTab = screen.getByRole("button", { name: /Ocultos/i });
    fireEvent.click(hiddenTab);

    expect(screen.getByText("Baby Doll Cetim Vinho")).toBeDefined();
    expect(screen.queryByText("Sutiã Renda Noir")).toBeNull();

    // Filtrar Destaques
    const featuredTab = screen.getByRole("button", { name: /Destaques/i });
    fireEvent.click(featuredTab);

    expect(screen.getByText("Sutiã Renda Noir")).toBeDefined();
    expect(screen.queryByText("Calcinha Algodão Doce")).toBeNull();
  });

  it("alterna visibilidade de um produto (ocultar e reativar) diretamente na interface (RF12, US11)", async () => {
    renderAdminProductsPage();

    await screen.findByText("Sutiã Renda Noir");

    // Sutiã Noir começa ativo. Clica no botão para ocultar.
    const hideBtn = screen.getByRole("button", { name: "Ocultar Sutiã Renda Noir" });
    expect(hideBtn).toBeDefined();
    expect(hideBtn.className).toContain("min-w-11");
    expect(hideBtn.className).toContain("min-h-11");

    fireEvent.click(hideBtn);

    // Mensagem de feedback exibida
    await waitFor(() => {
      expect(
        screen.getByText(/"Sutiã Renda Noir" foi ocultado da vitrine pública com sucesso\./i)
      ).toBeDefined();
    });

    // Agora o botão mudou para reativar
    const showBtn = await screen.findByRole("button", {
      name: "Reativar Sutiã Renda Noir",
    });
    expect(showBtn).toBeDefined();

    // Reativar produto
    fireEvent.click(showBtn);
    await waitFor(() => {
      expect(
        screen.getByText(/"Sutiã Renda Noir" foi reativado e já está visível na vitrine\./i)
      ).toBeDefined();
    });
  });

  it("abre modal de confirmação e exclui produto cadastrado por engano sem pedidos vinculados", async () => {
    renderAdminProductsPage();

    // "Calcinha Algodão Doce" não tem pedidos vinculados na base de demonstração
    await screen.findByText("Calcinha Algodão Doce");

    const deleteBtn = screen.getByRole("button", { name: "Excluir Calcinha Algodão Doce" });
    fireEvent.click(deleteBtn);

    // Modal de confirmação aberto
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText(/Excluir "Calcinha Algodão Doce"\?/i)).toBeDefined();

    // Confirma exclusão
    const confirmDeleteBtn = within(modal).getByRole("button", { name: "Confirmar Exclusão" });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/"Calcinha Algodão Doce" foi excluído do catálogo com sucesso\./i)
      ).toBeDefined();
      expect(screen.queryByText("Calcinha Algodão Doce")).toBeNull();
    });
  });

  it("trata conflito 409 Conflict ao tentar excluir produto com pedidos vinculados e orienta ocultação", async () => {
    renderAdminProductsPage();

    // "Sutiã Renda Noir" possui pedidos vinculados na base de demonstração
    await screen.findByText("Sutiã Renda Noir");

    const deleteBtn = screen.getByRole("button", { name: "Excluir Sutiã Renda Noir" });
    fireEvent.click(deleteBtn);

    const modal = screen.getByRole("dialog");
    const confirmDeleteBtn = within(modal).getByRole("button", { name: "Confirmar Exclusão" });
    fireEvent.click(confirmDeleteBtn);

    // Exibe o alerta de erro com botão orientando ocultar o produto
    await waitFor(() => {
      expect(screen.getByText("Exclusão Bloqueada por Histórico de Pedidos")).toBeDefined();
      expect(
        screen.getByText(
          /Não é possível excluir fisicamente um produto que já possui pedidos vinculados/i
        )
      ).toBeDefined();
    });

    // Clica no botão para ocultar em vez de excluir
    const hideInsteadBtn = screen.getByRole("button", {
      name: "Ocultar Produto Agora",
    });
    fireEvent.click(hideInsteadBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/"Sutiã Renda Noir" foi ocultado da vitrine pública com sucesso\./i)
      ).toBeDefined();
    });
  });
});
