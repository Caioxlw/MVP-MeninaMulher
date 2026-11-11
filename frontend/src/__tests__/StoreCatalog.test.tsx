import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import { ROUTES } from "../routes/routes.config";
import {
  fetchPublicProducts,
  mapApiProductToCatalogItem,
  type ApiPublicProductDto,
} from "../services/catalogApi";

const SEED_DATABASE_PRODUCTS: ApiPublicProductDto[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Conjunto Renda Aurora",
    description: "Conjunto em renda floral macia com bojo estruturado e calcinha fio duplo.",
    price: "89.90",
    active: true,
    featured: true,
    category: {
      id: "cat-conjuntos",
      name: "Conjuntos",
      slug: "conjuntos",
    },
    images: [
      {
        id: "img-aurora-detail",
        url: "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=800&q=80",
        altText: "Conjunto Renda Aurora Vermelho Rubi - Detalhe Renda",
        position: 1,
      },
      {
        id: "img-aurora-main",
        url: "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=800&q=80",
        altText: "Conjunto Renda Aurora Vermelho Rubi - Frente",
        position: 0,
      },
    ],
    variants: [
      { id: "var-aurora-p", size: "P", color: "Vermelho Rubi", stock: 8 },
      { id: "var-aurora-m", size: "M", color: "Vermelho Rubi", stock: 2 },
      { id: "var-aurora-g", size: "G", color: "Preto", stock: 0 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Sutiã Push-Up Pérola",
    description: "Sutiã em microfibra com alças ajustáveis e acabamento acetinado.",
    price: "59.90",
    active: true,
    featured: true,
    category: {
      id: "cat-sutias",
      name: "Sutiãs",
      slug: "sutias",
    },
    images: [
      {
        id: "img-perola-main",
        url: "https://images.unsplash.com/photo-1616150638538-ffb0679a3fc4?auto=format&fit=crop&w=800&q=80",
        altText: "Sutiã Push-Up Pérola Branco",
        position: 0,
      },
    ],
    variants: [
      { id: "var-perola-m", size: "M", color: "Branco", stock: 6 },
      { id: "var-perola-g", size: "G", color: "Nude", stock: 1 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Baby Doll Cetim Noite",
    description: "Conjunto curto de cetim com toque sedoso e detalhes em renda no decote.",
    price: "74.90",
    active: true,
    featured: false,
    category: {
      id: "cat-pijamas",
      name: "Pijamas & Baby Doll",
      slug: "pijamas-baby-doll",
    },
    images: [
      {
        id: "img-babydoll-main",
        url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80",
        altText: "Baby Doll Cetim Noite Rosa Chá",
        position: 0,
      },
    ],
    variants: [
      { id: "var-babydoll-p", size: "P", color: "Rosa Chá", stock: 5 },
      { id: "var-babydoll-m", size: "M", color: "Rosa Chá", stock: 0 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Calcinha Fio Conforto (Coleção Anterior)",
    description: "Modelo em algodão egípcio atualmente oculto do catálogo público.",
    price: "29.90",
    active: false,
    featured: false,
    category: {
      id: "cat-calcinhas",
      name: "Calcinhas",
      slug: "calcinhas",
    },
    images: [
      {
        id: "img-calcinha-main",
        url: "https://images.unsplash.com/photo-1583846783214-7229a91b20ed?auto=format&fit=crop&w=800&q=80",
        altText: "Calcinha Fio Conforto Preta",
        position: 0,
      },
    ],
    variants: [{ id: "var-calcinha-m", size: "M", color: "Preto", stock: 4 }],
  },
];

describe("Listagem de Produtos Ativos no Catálogo Público (PBI #20 — RF02, RNF01, RNF02, RNF07, US01)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mapeia o produto do banco selecionando a foto principal (position 0), altText, preço numérico e variações", () => {
    const mapped = mapApiProductToCatalogItem(SEED_DATABASE_PRODUCTS[0]);

    expect(mapped.id).toBe("00000000-0000-4000-8000-000000000001");
    expect(mapped.name).toBe("Conjunto Renda Aurora");
    expect(mapped.category).toBe("Conjuntos");
    expect(mapped.categorySlug).toBe("conjuntos");
    expect(mapped.price).toBe(89.9);
    // Mesmo que a imagem position 1 venha antes no array, deve priorizar position 0 como foto principal
    expect(mapped.imageUrl).toBe(
      "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=800&q=80"
    );
    expect(mapped.imageAlt).toBe("Conjunto Renda Aurora Vermelho Rubi - Frente");
    expect(mapped.sizes).toEqual(["P", "M", "G"]);
    expect(mapped.colorNames).toEqual(["Vermelho Rubi", "Preto"]);
    expect(mapped.stockStatus).toBe("available");
    expect(mapped.badgeText).toBe("Destaque");
  });

  it("busca os produtos em GET /api/products e filtra apenas produtos ativos (active: true)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => SEED_DATABASE_PRODUCTS,
      })
    );

    const activeProducts = await fetchPublicProducts();
    expect(activeProducts).toHaveLength(3);
    expect(activeProducts.map((p) => p.name)).toEqual([
      "Conjunto Renda Aurora",
      "Sutiã Push-Up Pérola",
      "Baby Doll Cetim Noite",
    ]);
    expect(
      activeProducts.some((p) => p.name.includes("Calcinha Fio Conforto (Coleção Anterior)"))
    ).toBe(false);
  });

  it("renderiza os cards de produtos ativos na página de Catálogo (/catalogo) com foto principal, nome, descrição e preço em BRL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => SEED_DATABASE_PRODUCTS,
      })
    );

    render(
      <MemoryRouter initialEntries={[ROUTES.store.catalog]}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Conjunto Renda Aurora")).toBeDefined();
    });

    // Verifica que apenas os 3 produtos ativos estão visíveis e o oculto (active: false) não aparece
    expect(screen.getByText("Sutiã Push-Up Pérola")).toBeDefined();
    expect(screen.getByText("Baby Doll Cetim Noite")).toBeDefined();
    expect(screen.queryByText("Calcinha Fio Conforto (Coleção Anterior)")).toBeNull();

    // Verifica foto principal (img com src e altText), nome e preço no card do Conjunto Renda Aurora
    const auroraCard = screen.getByTestId("product-card-00000000-0000-4000-8000-000000000001");
    const auroraImg = within(auroraCard).getByRole("img", {
      name: "Conjunto Renda Aurora Vermelho Rubi - Frente",
    });
    expect(auroraImg.getAttribute("src")).toBe(
      "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=800&q=80"
    );
    expect(within(auroraCard).getByText(/89,90/)).toBeDefined();
    expect(
      within(auroraCard).getByText(
        "Conjunto em renda floral macia com bojo estruturado e calcinha fio duplo."
      )
    ).toBeDefined();
  });

  it("exibe alerta e EmptyState quando a API está offline e permite tentar novamente ao restabelecer a conexão", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Falha de conexão com a API."))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => SEED_DATABASE_PRODUCTS,
      });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={[ROUTES.store.catalog]}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Catálogo indisponível no momento")).toBeDefined();
    });

    expect(screen.getByText("Não foi possível carregar o catálogo")).toBeDefined();
    expect(screen.queryByText("Conjunto Renda Aurora")).toBeNull();

    const retryButton = screen.getByRole("button", { name: "Tentar novamente" });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Conjunto Renda Aurora")).toBeDefined();
    });

    expect(screen.getByText("Sutiã Push-Up Pérola")).toBeDefined();
  });
});
