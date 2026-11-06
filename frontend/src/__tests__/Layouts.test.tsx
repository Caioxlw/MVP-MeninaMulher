import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AdminLayout } from "../components/layout/AdminLayout";
import { StoreLayout } from "../components/layout/StoreLayout";
import { AppRoutes } from "../routes/AppRoutes";
import { ROUTES } from "../routes/routes.config";

describe("Task #114 — Layouts Responsivos da Loja e do Painel Administrativo", () => {
  afterEach(() => {
    cleanup();
  });
  it("deve renderizar o cabeçalho da loja com menu, busca, favoritos e sacola com contador, além do rodapé", () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.store.home]}>
        <StoreLayout bagCount={5} favoritesCount={3}>
          <div>Conteúdo da Loja</div>
        </StoreLayout>
      </MemoryRouter>
    );

    expect(screen.getByLabelText("Abrir menu de navegação")).toBeDefined();
    expect(screen.getByPlaceholderText("Buscar peças...")).toBeDefined();
    expect(screen.getByTestId("store-favorites-count").textContent).toBe("3");
    expect(screen.getByTestId("store-bag-count").textContent).toBe("5");
    expect(screen.getByLabelText("Rodapé da loja")).toBeDefined();
    expect(screen.getByText("Compra 100% Protegida via WhatsApp")).toBeDefined();
  });

  it("deve abrir e fechar o Menu Gaveta Mobile da loja exibindo categorias, Guia de Medidas e botão do WhatsApp", () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.store.home]}>
        <StoreLayout bagCount={4} favoritesCount={8}>
          <div>Conteúdo da Loja</div>
        </StoreLayout>
      </MemoryRouter>
    );

    const openMenuButton = screen.getByLabelText("Abrir menu de navegação");
    fireEvent.click(openMenuButton);

    expect(screen.getByRole("dialog", { name: "Menu de navegação da loja" })).toBeDefined();
    expect(screen.getByText("Bem-vinda à Menina Mulher")).toBeDefined();
    expect(screen.getByText("42 peças")).toBeDefined();
    expect(screen.getByText("Fale com a dona da loja")).toBeDefined();

    const closeMenuButton = screen.getByLabelText("Fechar menu de navegação");
    fireEvent.click(closeMenuButton);

    expect(screen.queryByRole("dialog", { name: "Menu de navegação da loja" })).toBeNull();
  });

  it("deve renderizar o layout do painel com navegação inferior no celular e menu lateral no computador, destacando a seção atual", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={[ROUTES.admin.products]}>
        <AdminLayout pendingOrdersCount={4}>
          <div>Tela de Produtos</div>
        </AdminLayout>
      </MemoryRouter>
    );

    const sidebarProducts = screen.getByTestId("admin-sidebar-link-products");
    const sidebarOrders = screen.getByTestId("admin-sidebar-link-orders");
    const bottomProducts = screen.getByTestId("admin-bottom-link-products");
    const bottomStock = screen.getByTestId("admin-bottom-link-stock");

    expect(sidebarProducts.getAttribute("aria-current")).toBe("page");
    expect(bottomProducts.getAttribute("aria-current")).toBe("page");
    expect(sidebarOrders.getAttribute("aria-current")).toBeNull();
    expect(bottomStock.getAttribute("aria-current")).toBeNull();
    expect(screen.getByTestId("admin-bottom-badge-orders").textContent).toBe("4");
    expect(screen.getByText("Sair do Painel")).toBeDefined();

    unmount();

    render(
      <MemoryRouter initialEntries={[ROUTES.admin.stock]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByTestId("admin-sidebar-link-stock").getAttribute("aria-current")).toBe(
      "page"
    );
    expect(screen.getByTestId("admin-bottom-link-stock").getAttribute("aria-current")).toBe("page");
  });
});
