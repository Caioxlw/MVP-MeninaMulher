import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../routes/AppRoutes";
import {
  fetchPublicProductDetail,
  resolveProductGalleryImages,
  type ApiPublicProductDto,
} from "../services/catalogApi";

const SEED_AURORA_PRODUCT: ApiPublicProductDto = {
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
      id: "img-aurora-front",
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
};

describe("Página de Detalhes do Produto com Galeria, Tamanhos e Cores (PBI #22 — RF04, RF05, RNF01, RNF07, US01, US03)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("normaliza e ordena as fotos da galeria por position crescente com texto alternativo acessível", () => {
    const gallery = resolveProductGalleryImages({
      id: SEED_AURORA_PRODUCT.id,
      name: SEED_AURORA_PRODUCT.name,
      images: [
        {
          id: "img-2",
          url: "https://example.com/foto-2.jpg",
          altText: "Foto 2 Detalhe",
          position: 1,
        },
        {
          id: "img-1",
          url: "https://example.com/foto-1.jpg",
          altText: "Foto 1 Principal",
          position: 0,
        },
      ],
    });

    expect(gallery).toHaveLength(2);
    expect(gallery[0].altText).toBe("Foto 1 Principal");
    expect(gallery[1].altText).toBe("Foto 2 Detalhe");
  });

  it("renderiza os detalhes do produto do banco e permite navegar entre as fotos da galeria por miniaturas e botões Anterior/Próxima", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/variants")) {
          return {
            ok: true,
            status: 200,
            json: async () => SEED_AURORA_PRODUCT.variants,
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => SEED_AURORA_PRODUCT,
        };
      })
    );

    render(
      <MemoryRouter initialEntries={["/produto/00000000-0000-4000-8000-000000000001"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Conjunto Renda Aurora" })).toBeDefined();
    });

    expect(screen.getByText(/89,90/)).toBeDefined();
    expect(screen.getByTestId("product-detail-description").textContent).toContain(
      "Conjunto em renda floral macia com bojo estruturado e calcinha fio duplo."
    );

    // Verifica foto inicial (1 / 2)
    const mainImage = screen.getByTestId("gallery-main-image");
    const counter = screen.getByTestId("gallery-counter");
    expect(counter.textContent).toBe("1 / 2");
    expect(mainImage.getAttribute("alt")).toBe("Conjunto Renda Aurora Vermelho Rubi - Frente");

    // Miniaturas clicáveis com área de toque >= 44px (touch-target)
    const thumb0 = screen.getByTestId("gallery-thumbnail-0");
    const thumb1 = screen.getByTestId("gallery-thumbnail-1");
    expect(thumb0.getAttribute("aria-pressed")).toBe("true");
    expect(thumb1.getAttribute("aria-pressed")).toBe("false");
    expect(thumb1.className).toContain("touch-target");

    // Clica na segunda miniatura
    fireEvent.click(thumb1);
    expect(screen.getByTestId("gallery-counter").textContent).toBe("2 / 2");
    expect(screen.getByTestId("gallery-main-image").getAttribute("alt")).toBe(
      "Conjunto Renda Aurora Vermelho Rubi - Detalhe Renda"
    );
    expect(thumb1.getAttribute("aria-pressed")).toBe("true");

    // Usa botão "Foto anterior" (>= 44px) para voltar à foto 1
    const prevBtn = screen.getByTestId("gallery-prev-btn");
    expect(prevBtn.className).toContain("min-h-11");
    fireEvent.click(prevBtn);
    expect(screen.getByTestId("gallery-counter").textContent).toBe("1 / 2");

    // Usa botão "Próxima foto" para avançar novamente à foto 2
    const nextBtn = screen.getByTestId("gallery-next-btn");
    fireEvent.click(nextBtn);
    expect(screen.getByTestId("gallery-counter").textContent).toBe("2 / 2");
  });

  it("exibe cores e tamanhos reais do produto, bloqueia cor esgotada e adiciona variação disponível à sacola", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/variants")) {
          return {
            ok: true,
            status: 200,
            json: async () => SEED_AURORA_PRODUCT.variants,
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => SEED_AURORA_PRODUCT,
        };
      })
    );

    render(
      <MemoryRouter initialEntries={["/produto/00000000-0000-4000-8000-000000000001"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Conjunto Renda Aurora" })).toBeDefined();
    });

    // Cor Vermelho Rubi está disponível e selecionada; Cor Preto está Esgotada (stock: 0)
    const rubiBtn = screen.getByRole("button", { name: /Cor Vermelho Rubi - Disponível/i });
    const pretoBtn = screen.getByRole("button", { name: /Cor Preto - Esgotado/i });
    expect(rubiBtn.getAttribute("aria-pressed")).toBe("true");
    expect(pretoBtn.hasAttribute("disabled")).toBe(true);

    // Tamanhos P (8 un.) e M (2 un.) em Vermelho Rubi
    const sizeP = screen.getByTestId("size-option-P");
    const sizeM = screen.getByTestId("size-option-M");
    expect(within(sizeP).getByText("Disponível")).toBeDefined();
    expect(within(sizeM).getByText("Últimas unidades")).toBeDefined();

    fireEvent.click(sizeM);
    const addBtn = screen.getByRole("button", { name: /Adicionar à sacola/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Adicionado à sacola!")).toBeDefined();
  });

  it("exibe alerta e EmptyState quando o produto não existe ou está oculto (404 em GET /api/products/:id)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: "Produto não encontrado ou indisponível no catálogo." }),
      })
    );

    const detailRes = await fetchPublicProductDetail("produto-inexistente-404");
    expect(detailRes.status).toBe("not_found");
    expect(detailRes.product).toBeNull();

    render(
      <MemoryRouter initialEntries={["/produto/produto-inexistente-404"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Produto indisponível ou não encontrado")).toBeDefined();
    });

    expect(screen.getByText("Não encontramos esta peça")).toBeDefined();
    expect(screen.getByRole("button", { name: "Voltar ao Catálogo" })).toBeDefined();
  });
});
