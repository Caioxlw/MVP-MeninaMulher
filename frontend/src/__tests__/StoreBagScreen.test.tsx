import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreProvider } from "../contexts/StoreContext";
import { StoreBagScreen } from "../pages/store/StoreBagScreen";
import { ROUTES, STORE_ROUTE_DESCRIPTORS } from "../routes/routes.config";
import { CART_STORAGE_KEY } from "../services/storeStorage";
import type { CartItem } from "../types/cart";

const BAG_DESCRIPTOR = STORE_ROUTE_DESCRIPTORS.find((d) => d.path === ROUTES.store.bag)!;

const SAMPLE_ITEMS: CartItem[] = [
  {
    id: "sutia-renda-noir-var-1",
    productId: "sutia-renda-noir",
    variantId: "var-1",
    name: "Sutiã Renda Floral",
    category: "Partes de Cima",
    color: "Preto",
    colorHex: "#23101B",
    size: "P",
    unitPrice: 119.9,
    quantity: 1,
    imageUrl: "https://cdn.example.com/sutia-preto.jpg",
    imageAlt: "Sutiã Renda Floral Preto",
  },
  {
    id: "calcinha-algodao-doce-var-2",
    productId: "calcinha-algodao-doce",
    variantId: "var-2",
    name: "Calcinha Algodão Doce",
    category: "Partes de Baixo",
    color: "Rosa",
    colorHex: "#F5CCD0",
    size: "M",
    unitPrice: 39.9,
    quantity: 2,
    imageAlt: "Calcinha Algodão Doce Rosa",
  },
];

function renderBagScreen(initialItems: CartItem[] = []) {
  localStorage.clear();
  if (initialItems.length > 0) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initialItems));
  }

  return render(
    <MemoryRouter initialEntries={[ROUTES.store.bag]}>
      <StoreProvider>
        <Routes>
          <Route path={ROUTES.store.bag} element={<StoreBagScreen descriptor={BAG_DESCRIPTOR} />} />
          <Route path={ROUTES.store.home} element={<div data-testid="store-home">Catálogo</div>} />
        </Routes>
      </StoreProvider>
    </MemoryRouter>
  );
}

describe("Issue #220 — StoreBagScreen (/sacola)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("exibe EmptyState sem botão de demonstração e redireciona para o catálogo quando a sacola está vazia", () => {
    renderBagScreen([]);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Sua sacola está vazia")).toBeInTheDocument();
    expect(screen.queryByText("Restaurar Peças de Demonstração")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Explorar Catálogo" }));
    expect(screen.getByTestId("store-home")).toBeInTheDocument();
  });

  it("renderiza os itens reais da sacola com imagem, fallback visual, variações, preços e totais", () => {
    renderBagScreen(SAMPLE_ITEMS);

    expect(screen.getByText("3 itens selecionados")).toBeInTheDocument();
    expect(screen.getByText("Sutiã Renda Floral")).toBeInTheDocument();
    expect(screen.getByText("Calcinha Algodão Doce")).toBeInTheDocument();

    const img = screen.getByRole("img", { name: "Sutiã Renda Floral Preto" });
    expect(img).toHaveAttribute("src", "https://cdn.example.com/sutia-preto.jpg");
    expect(screen.getByText("Partes de Baixo")).toBeInTheDocument();

    expect(screen.getByText("Preto")).toBeInTheDocument();
    expect(screen.getByText("Rosa")).toBeInTheDocument();
    expect(screen.getByText("Subtotal (3 peças)")).toBeInTheDocument();
    expect(screen.getAllByText(/199,70/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/79,80/).length).toBeGreaterThanOrEqual(1);
  });

  it("atualiza quantidades via botões acessíveis (+ e -) e remove item ao zerar ou clicar na lixeira", () => {
    renderBagScreen(SAMPLE_ITEMS);

    const increaseBtn = screen.getByRole("button", {
      name: "Aumentar quantidade de Sutiã Renda Floral",
    });
    const decreaseBtn = screen.getByRole("button", {
      name: "Diminuir quantidade de Sutiã Renda Floral",
    });
    const removeBtn = screen.getByRole("button", {
      name: "Remover Calcinha Algodão Doce da sacola",
    });

    expect(increaseBtn.className).toContain("touch-target");
    expect(decreaseBtn.className).toContain("touch-target");
    expect(removeBtn.className).toContain("touch-target");

    fireEvent.click(increaseBtn);
    expect(screen.getByText("4 itens selecionados")).toBeInTheDocument();
    expect(screen.getAllByText(/319,60/).length).toBeGreaterThanOrEqual(2);

    fireEvent.click(decreaseBtn);
    expect(screen.getByText("3 itens selecionados")).toBeInTheDocument();

    fireEvent.click(decreaseBtn);
    expect(screen.queryByText("Sutiã Renda Floral")).not.toBeInTheDocument();
    expect(screen.getByText("2 itens selecionados")).toBeInTheDocument();

    fireEvent.click(removeBtn);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("exibe modal de confirmação ao clicar em Limpar sacola e esvazia apenas ao confirmar", () => {
    renderBagScreen(SAMPLE_ITEMS);

    fireEvent.click(screen.getByRole("button", { name: "Limpar sacola" }));
    expect(screen.getByRole("dialog", { name: "Limpar sacola?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Sutiã Renda Floral")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpar sacola" }));
    fireEvent.click(screen.getByRole("button", { name: "Sim, limpar sacola" }));
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("exibe 'A definir no WhatsApp' no envio e gera link WhatsApp com os itens reais, cliente, observações e total", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderBagScreen(SAMPLE_ITEMS);

    expect(screen.getByText("A definir no WhatsApp")).toBeInTheDocument();
    expect(screen.queryByText(/Retirada na loja/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Entrega \/ Motoboy/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Ex.: Amanda Ferreira"), {
      target: { value: "Amanda" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex.: Embalagem para presente, tirar etiqueta..."), {
      target: { value: "Embalar para presente" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Enviar Pedido pelo WhatsApp/i }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, target, features] = openSpy.mock.calls[0];
    expect(url).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/);
    expect(target).toBe("_blank");
    expect(features).toBe("noopener,noreferrer");

    const decoded = decodeURIComponent(String(url).split("?text=")[1]);
    expect(decoded).toContain("- 1x Sutiã Renda Floral (Preto, Tam P)");
    expect(decoded).toContain("- 2x Calcinha Algodão Doce (Rosa, Tam M)");
    expect(decoded).toContain("Forma de envio: A definir no WhatsApp");
    expect(decoded).toContain("Cliente: Amanda");
    expect(decoded).toContain("Obs: Embalar para presente");
    expect(decoded).toContain("Total: R$");
    expect(decoded).toContain("199,70");
  });
});
