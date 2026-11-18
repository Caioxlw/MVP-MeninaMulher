import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreProvider, useCart, useFavorites } from "../../contexts/StoreContext";
import { AppRoutes } from "../../routes/AppRoutes";
import { CART_STORAGE_KEY, FAVORITES_STORAGE_KEY } from "../../services/storeStorage";
import type { AddToCartInput, FavoriteItem } from "../../types/cart";

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <StoreProvider>{children}</StoreProvider>;
  };
}

function useCombinedStore() {
  return {
    cart: useCart(),
    favorites: useFavorites(),
  };
}

const SAMPLE_BRA: AddToCartInput = {
  productId: "sutia-renda-noir",
  variantId: "var-bra-preto-p",
  name: "Sutiã Renda Noir",
  category: "Partes de Cima",
  color: "Preto",
  colorHex: "#23101B",
  size: "P",
  unitPrice: 119.9,
  imageUrl: "/uploads/sutia-noir.jpg",
  imageAlt: "Sutiã Renda Noir Preto",
};

const SAMPLE_PANTY: AddToCartInput = {
  productId: "calcinha-algodao-doce",
  variantId: "var-panty-rosa-m",
  name: "Calcinha Algodão Doce",
  category: "Partes de Baixo",
  color: "Rosa",
  colorHex: "#F5CCD0",
  size: "M",
  unitPrice: 39.9,
  imageUrl: "/uploads/calcinha-rosa.jpg",
  imageAlt: "Calcinha Algodão Doce Rosa",
};

const FAVORITE_WITH_VARIANT: FavoriteItem = {
  productId: "sutia-renda-noir",
  name: "Sutiã Renda Noir",
  category: "Partes de Cima",
  price: 119.9,
  imageUrl: "/uploads/sutia-noir.jpg",
  imageAlt: "Sutiã Renda Noir",
  variantId: "var-bra-preto-p",
  color: "Preto",
  colorHex: "#23101B",
  size: "P",
};

const FAVORITE_WITHOUT_VARIANT: FavoriteItem = {
  productId: "conjunto-microfibra-nude",
  name: "Conjunto Microfibra Nude",
  category: "Conjuntos",
  price: 149.9,
  imageUrl: "/uploads/conjunto-nude.jpg",
  imageAlt: "Conjunto Microfibra Nude",
};

describe("StoreContext (Cart & Favorites)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("deve adicionar novos itens e consolidar quantidade para a mesma variantId", () => {
    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    act(() => {
      result.current.addToCart(SAMPLE_BRA);
      result.current.addToCart(SAMPLE_BRA, 2);
      result.current.addToCart({
        ...SAMPLE_BRA,
        variantId: "var-bra-preto-m",
        size: "M",
      });
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0]).toMatchObject({
      id: "sutia-renda-noir-var-bra-preto-p",
      productId: "sutia-renda-noir",
      variantId: "var-bra-preto-p",
      quantity: 3,
    });
    expect(result.current.items[1]).toMatchObject({
      id: "sutia-renda-noir-var-bra-preto-m",
      size: "M",
      quantity: 1,
    });
    expect(result.current.totalCount).toBe(4);
  });

  it("deve ignorar adição com quantidade inválida (<= 0 ou NaN)", () => {
    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    act(() => {
      result.current.addToCart(SAMPLE_BRA, 0);
      result.current.addToCart(SAMPLE_BRA, -2);
      result.current.addToCart(SAMPLE_BRA, Number.NaN);
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.totalAmount).toBe(0);
  });

  it("deve atualizar quantidade com delta positivo/negativo e remover automaticamente no zero", () => {
    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    act(() => {
      result.current.addToCart(SAMPLE_PANTY, 2);
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.updateQuantity(itemId, 1);
    });
    expect(result.current.items[0].quantity).toBe(3);

    act(() => {
      result.current.updateQuantity(itemId, -2);
    });
    expect(result.current.items[0].quantity).toBe(1);

    act(() => {
      result.current.updateQuantity(itemId, -1);
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalCount).toBe(0);
  });

  it("deve remover item específico e limpar toda a sacola", () => {
    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    act(() => {
      result.current.addToCart(SAMPLE_BRA, 1);
      result.current.addToCart(SAMPLE_PANTY, 2);
    });

    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.removeFromCart("sutia-renda-noir-var-bra-preto-p");
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe("calcinha-algodao-doce");

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.totalAmount).toBe(0);
  });

  it("deve calcular totalCount e totalAmount com exatidão em BRL", () => {
    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    act(() => {
      result.current.addToCart(SAMPLE_BRA, 1); // 119.90
      result.current.addToCart(SAMPLE_PANTY, 2); // 2 * 39.90 = 79.80
    });

    expect(result.current.totalCount).toBe(3);
    expect(result.current.totalAmount).toBe(199.7);
  });

  it("deve persistir e restaurar sacola e favoritos no localStorage com chaves versionadas", () => {
    const wrapper = createWrapper();
    const { result, unmount } = renderHook(() => useCombinedStore(), { wrapper });

    act(() => {
      result.current.cart.addToCart(SAMPLE_BRA, 2);
      result.current.favorites.addToFavorites(FAVORITE_WITHOUT_VARIANT);
    });

    const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
    const rawFavorites = window.localStorage.getItem(FAVORITES_STORAGE_KEY);

    expect(rawCart).not.toBeNull();
    expect(rawFavorites).not.toBeNull();
    expect(JSON.parse(rawCart!)).toHaveLength(1);
    expect(JSON.parse(rawFavorites!)).toHaveLength(1);

    unmount();

    const { result: restored } = renderHook(() => useCombinedStore(), { wrapper: createWrapper() });
    expect(restored.current.cart.items).toHaveLength(1);
    expect(restored.current.cart.totalCount).toBe(2);
    expect(restored.current.cart.totalAmount).toBe(239.8);
    expect(restored.current.favorites.favorites).toHaveLength(1);
    expect(restored.current.favorites.isFavorite("conjunto-microfibra-nude")).toBe(true);
  });

  it("deve lidar graciosamente com JSON corrompido ou indisponibilidade do localStorage", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "{json-invalido");
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([{ invalid: true }]));

    const { result } = renderHook(() => useCombinedStore(), { wrapper: createWrapper() });
    expect(result.current.cart.items).toEqual([]);
    expect(result.current.favorites.favorites).toEqual([]);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    act(() => {
      result.current.cart.addToCart(SAMPLE_PANTY, 1);
      result.current.favorites.toggleFavorite(FAVORITE_WITH_VARIANT);
    });

    // Continua funcionando em memória mesmo com falha de escrita no storage
    expect(result.current.cart.totalCount).toBe(1);
    expect(result.current.favorites.favoritesCount).toBe(1);
  });

  it("deve sincronizar estado reativamente quando ocorrer evento storage em outra aba", () => {
    const { result } = renderHook(() => useCombinedStore(), { wrapper: createWrapper() });

    const externalCart = [
      { ...SAMPLE_PANTY, id: "calcinha-algodao-doce-var-panty-rosa-m", quantity: 3 },
    ];
    const externalFavorites = [FAVORITE_WITHOUT_VARIANT];

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: CART_STORAGE_KEY,
          newValue: JSON.stringify(externalCart),
        })
      );
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: FAVORITES_STORAGE_KEY,
          newValue: JSON.stringify(externalFavorites),
        })
      );
    });

    expect(result.current.cart.totalCount).toBe(3);
    expect(result.current.cart.totalAmount).toBe(119.7);
    expect(result.current.favorites.favoritesCount).toBe(1);
    expect(result.current.favorites.isFavorite("conjunto-microfibra-nude")).toBe(true);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: CART_STORAGE_KEY,
          newValue: null,
        })
      );
    });

    expect(result.current.cart.items).toEqual([]);
  });

  it("deve manipular favoritos e transferir apenas peças com variante em moveAllFavoritesToCart", () => {
    const { result } = renderHook(() => useCombinedStore(), { wrapper: createWrapper() });

    act(() => {
      result.current.favorites.addToFavorites(FAVORITE_WITH_VARIANT);
      result.current.favorites.addToFavorites(FAVORITE_WITH_VARIANT); // sem duplicar
      result.current.favorites.addToFavorites(FAVORITE_WITHOUT_VARIANT);
    });

    expect(result.current.favorites.favoritesCount).toBe(2);
    expect(result.current.favorites.isFavorite("sutia-renda-noir")).toBe(true);

    let transferResult!: ReturnType<typeof result.current.favorites.moveAllFavoritesToCart>;

    act(() => {
      transferResult = result.current.favorites.moveAllFavoritesToCart();
    });

    expect(transferResult.transferredCount).toBe(1);
    expect(transferResult.transferredItems).toHaveLength(1);
    expect(transferResult.transferredItems[0]).toMatchObject({
      productId: "sutia-renda-noir",
      variantId: "var-bra-preto-p",
      quantity: 1,
    });
    expect(transferResult.pendingFavorites).toEqual([FAVORITE_WITHOUT_VARIANT]);

    // Item transferido entrou na sacola e saiu dos favoritos; item sem variante permaneceu pendente
    expect(result.current.cart.totalCount).toBe(1);
    expect(result.current.favorites.favoritesCount).toBe(1);
    expect(result.current.favorites.isFavorite("sutia-renda-noir")).toBe(false);
    expect(result.current.favorites.isFavorite("conjunto-microfibra-nude")).toBe(true);

    act(() => {
      result.current.favorites.toggleFavorite(FAVORITE_WITHOUT_VARIANT);
    });
    expect(result.current.favorites.favoritesCount).toBe(0);
  });

  it("deve ignorar atualização de quantidade com delta não inteiro ou zero", () => {
    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    act(() => {
      result.current.addToCart(SAMPLE_PANTY, 2);
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.updateQuantity(itemId, 0.5);
      result.current.updateQuantity(itemId, 0);
      result.current.updateQuantity(itemId, Number.NaN);
    });

    expect(result.current.items[0].quantity).toBe(2);
  });

  it("deve ignorar addToCart com productId ou variantId vazios", () => {
    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    act(() => {
      result.current.addToCart({ ...SAMPLE_BRA, productId: "   " });
      result.current.addToCart({ ...SAMPLE_BRA, variantId: "" });
    });

    expect(result.current.items).toHaveLength(0);
  });

  it("não deve disparar escrita no localStorage no mount nem em evento storage externo", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const { unmount } = renderHook(() => useCombinedStore(), { wrapper: createWrapper() });
    expect(setItemSpy).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: CART_STORAGE_KEY,
          newValue: JSON.stringify([{ ...SAMPLE_BRA, quantity: 1 }]),
        })
      );
    });

    expect(setItemSpy).not.toHaveBeenCalled();
    unmount();
  });

  it("moveAllFavoritesToCart deve usar cor padrão e não duplicar em chamadas consecutivas", () => {
    const { result } = renderHook(() => useCombinedStore(), { wrapper: createWrapper() });

    const favNoHex: FavoriteItem = {
      productId: "sutia-renda-noir",
      name: "Sutiã Renda Noir",
      category: "Partes de Cima",
      price: 119.9,
      imageAlt: "Sutiã",
      variantId: "var-bra-1",
      color: "Preto",
      size: "P",
    };

    act(() => {
      result.current.favorites.addToFavorites(favNoHex);
    });

    act(() => {
      result.current.favorites.moveAllFavoritesToCart();
      result.current.favorites.moveAllFavoritesToCart(); // chamada consecutiva no mesmo tick
    });

    expect(result.current.cart.items).toHaveLength(1);
    expect(result.current.cart.items[0].colorHex).toBe("#23101B");
    expect(result.current.cart.items[0].quantity).toBe(1);
    expect(result.current.favorites.favorites).toHaveLength(0);
  });

  it("deve lançar erro claro ao chamar useCart ou useFavorites fora do StoreProvider", () => {
    expect(() => renderHook(() => useCart())).toThrow(/StoreProvider/);
    expect(() => renderHook(() => useFavorites())).toThrow(/StoreProvider/);
  });

  it("deve disponibilizar StoreProvider nas rotas da loja em AppRoutes", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "healthy", data: [] }),
      })
    );

    render(
      <MemoryRouter initialEntries={["/sacola"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByText("Sacola de Compras")).toBeDefined();
  });
});
