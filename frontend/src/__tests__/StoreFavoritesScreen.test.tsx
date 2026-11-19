import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import { ROUTES } from "../routes/routes.config";
import type { ApiPublicProductDto } from "../services/catalogApi";
import { CART_STORAGE_KEY, FAVORITES_STORAGE_KEY } from "../services/storeStorage";
import type { CartItem, FavoriteItem } from "../types/cart";

const CATALOG_PRODUCTS_MOCK: ApiPublicProductDto[] = [
  {
    id: "prod-aurora-1",
    name: "Conjunto Renda Aurora",
    description: "Conjunto em renda floral macia.",
    price: "89.90",
    active: true,
    featured: true,
    category: { id: "cat-1", name: "Conjuntos", slug: "conjuntos" },
    images: [
      {
        id: "img-1",
        url: "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=800&q=80",
        altText: "Conjunto Renda Aurora - Frente",
        position: 0,
      },
    ],
    variants: [
      { id: "var-aurora-p", size: "P", color: "Vermelho Rubi", stock: 5 },
      { id: "var-aurora-m", size: "M", color: "Preto", stock: 0 },
    ],
  },
];

describe("Task #217 — Tela de Favoritos conectada ao StoreContext (/favoritos)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => CATALOG_PRODUCTS_MOCK,
      })
    );
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("exibe estado vazio sem itens hardcoded e sem botão Restaurar Favoritos", async () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.store.favorites]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByText("Meus Favoritos")).toBeDefined();
    expect(screen.getByTestId("favorites-saved-count").textContent).toContain("0 peças salvas");
    expect(screen.getByText("Sua lista de desejos está vazia")).toBeDefined();
    expect(screen.queryByText("Restaurar Favoritos")).toBeNull();
    expect(screen.queryByText("Sutiã Renda Noir")).toBeNull();

    const addAllBtn = screen.getByRole("button", { name: /Adicionar todos à sacola/i });
    expect((addAllBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("renderiza favoritos salvos no localStorage, permite remover um item e limpar favoritos", async () => {
    const savedFavorites: FavoriteItem[] = [
      {
        productId: "prod-aurora-1",
        name: "Conjunto Renda Aurora",
        category: "Conjuntos",
        price: 89.9,
        imageAlt: "Conjunto Renda Aurora - Frente",
        variantId: "var-aurora-p",
        color: "Vermelho Rubi",
        colorHex: "#9E1B46",
        size: "P",
      },
      {
        productId: "prod-perola-2",
        name: "Sutiã Push-Up Pérola",
        category: "Sutiãs",
        price: 59.9,
        imageAlt: "Sutiã Push-Up Pérola",
        variantId: "var-perola-m",
        color: "Branco",
        colorHex: "#FFFFFF",
        size: "M",
      },
    ];
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(savedFavorites));

    render(
      <MemoryRouter initialEntries={[ROUTES.store.favorites]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByText("Conjunto Renda Aurora")).toBeDefined();
    expect(screen.getByText("Sutiã Push-Up Pérola")).toBeDefined();
    expect(screen.getByTestId("store-favorites-count").textContent).toBe("2");

    fireEvent.click(screen.getByLabelText("Remover Sutiã Push-Up Pérola dos favoritos"));

    await waitFor(() => {
      expect(screen.queryByText("Sutiã Push-Up Pérola")).toBeNull();
    });
    expect(screen.getByTestId("store-favorites-count").textContent).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Limpar Favoritos" }));

    await waitFor(() => {
      expect(screen.getByText("Sua lista de desejos está vazia")).toBeDefined();
    });
    expect(screen.queryByTestId("store-favorites-count")).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]")).toEqual([]);
  });

  it("permite favoritar na vitrine (/catalogo), visualizar em /favoritos e mover todos os válidos para a sacola", async () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.store.catalog]}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Conjunto Renda Aurora")).toBeDefined();
    });

    const card = screen.getByTestId("product-card-prod-aurora-1");
    fireEvent.click(within(card).getByLabelText("Adicionar Conjunto Renda Aurora aos favoritos"));

    expect(screen.getByTestId("store-favorites-count").textContent).toBe("1");

    // Navega para /favoritos pelo atalho do cabeçalho
    fireEvent.click(screen.getByLabelText("Favoritos (1 itens)"));

    await waitFor(() => {
      expect(screen.getByText("Meus Favoritos")).toBeDefined();
    });
    expect(screen.getByText("Conjunto Renda Aurora")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Adicionar todos à sacola/i }));

    await waitFor(() => {
      expect(screen.getByText("Sacola de Compras")).toBeDefined();
    });

    expect(screen.getByTestId("store-bag-count").textContent).toBe("1");
    expect(screen.queryByTestId("store-favorites-count")).toBeNull();

    const persistedCart = JSON.parse(
      window.localStorage.getItem(CART_STORAGE_KEY) || "[]"
    ) as CartItem[];
    expect(persistedCart).toHaveLength(1);
    expect(persistedCart[0]).toMatchObject({
      productId: "prod-aurora-1",
      variantId: "var-aurora-p",
      color: "Vermelho Rubi",
      size: "P",
      unitPrice: 89.9,
      quantity: 1,
    });
  });

  it("exibe alerta quando há favorito sem variação definida ao clicar em Adicionar todos à sacola", async () => {
    const mixedFavorites: FavoriteItem[] = [
      {
        productId: "prod-aurora-1",
        name: "Conjunto Renda Aurora",
        category: "Conjuntos",
        price: 89.9,
        imageAlt: "Conjunto Renda Aurora",
        variantId: "var-aurora-p",
        color: "Vermelho Rubi",
        colorHex: "#9E1B46",
        size: "P",
      },
      {
        productId: "prod-sem-variante",
        name: "Body Renda Sem Seleção",
        category: "Conjuntos",
        price: 129.9,
        imageAlt: "Body Renda Sem Seleção",
      },
    ];
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(mixedFavorites));

    render(
      <MemoryRouter initialEntries={[ROUTES.store.favorites]}>
        <AppRoutes />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Adicionar todos à sacola/i }));

    await waitFor(() => {
      expect(screen.getByText("1 peça(s) adicionada(s) à sacola")).toBeDefined();
    });

    // O item com variação entrou na sacola e o pendente permaneceu nos favoritos
    expect(screen.getByTestId("store-bag-count").textContent).toBe("1");
    expect(screen.getByTestId("store-favorites-count").textContent).toBe("1");
    expect(screen.getByText("Body Renda Sem Seleção")).toBeDefined();
    expect(screen.queryByText("Conjunto Renda Aurora")).toBeNull();
  });
});
