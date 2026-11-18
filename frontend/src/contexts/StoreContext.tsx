import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CART_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
  isValidCartItem,
  isValidFavoriteItem,
  parseStorageList,
  readStorageList,
  writeStorageList,
} from "../services/storeStorage";
import type {
  AddToCartInput,
  CartContextValue,
  CartItem,
  FavoriteItem,
  FavoritesContextValue,
  MoveFavoritesToCartResult,
} from "../types/cart";

const DEFAULT_COLOR_HEX = "#23101B";

const CartContext = createContext<CartContextValue | null>(null);
const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function buildCartItemId(productId: string, variantId: string): string {
  return `${productId}-${variantId}`;
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.floor(quantity);
}

function mergeCartItem(currentItems: CartItem[], input: AddToCartInput, quantity: number): CartItem[] {
  if (!input.productId?.trim() || !input.variantId?.trim()) return currentItems;

  const safeQuantity = normalizeQuantity(quantity);
  if (safeQuantity <= 0) return currentItems;

  const targetId = input.id?.trim() || buildCartItemId(input.productId, input.variantId);
  const existingIndex = currentItems.findIndex(
    (item) => item.id === targetId || item.variantId === input.variantId
  );

  if (existingIndex >= 0) {
    return currentItems.map((item, idx) =>
      idx === existingIndex ? { ...item, quantity: item.quantity + safeQuantity } : item
    );
  }

  return [
    ...currentItems,
    {
      ...input,
      id: targetId,
      quantity: safeQuantity,
    },
  ];
}

function hasCompleteVariant(
  item: FavoriteItem
): item is FavoriteItem & { variantId: string; color: string; size: string } {
  return Boolean(
    item.variantId &&
      item.variantId.trim().length > 0 &&
      item.color &&
      item.color.trim().length > 0 &&
      item.size &&
      item.size.trim().length > 0
  );
}

function favoriteToCartItem(
  fav: FavoriteItem & { variantId: string; color: string; size: string }
): CartItem {
  return {
    id: buildCartItemId(fav.productId, fav.variantId),
    productId: fav.productId,
    variantId: fav.variantId,
    name: fav.name,
    category: fav.category,
    color: fav.color,
    colorHex: fav.colorHex?.trim() || DEFAULT_COLOR_HEX,
    size: fav.size,
    unitPrice: fav.price,
    quantity: 1,
    imageUrl: fav.imageUrl,
    imageAlt: fav.imageAlt,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() =>
    readStorageList(CART_STORAGE_KEY, isValidCartItem)
  );
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() =>
    readStorageList(FAVORITES_STORAGE_KEY, isValidFavoriteItem)
  );

  const skipCartWriteRef = useRef(true);
  const skipFavoritesWriteRef = useRef(true);
  const favoritesRef = useRef<FavoriteItem[]>(favorites);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(() => {
    if (skipCartWriteRef.current) {
      skipCartWriteRef.current = false;
      return;
    }
    writeStorageList(CART_STORAGE_KEY, items);
  }, [items]);

  useEffect(() => {
    if (skipFavoritesWriteRef.current) {
      skipFavoritesWriteRef.current = false;
      return;
    }
    writeStorageList(FAVORITES_STORAGE_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) {
        skipCartWriteRef.current = true;
        setItems(parseStorageList(event.newValue, isValidCartItem));
      } else if (event.key === FAVORITES_STORAGE_KEY) {
        skipFavoritesWriteRef.current = true;
        setFavorites(parseStorageList(event.newValue, isValidFavoriteItem));
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const addToCart = useCallback((item: AddToCartInput, quantity = 1) => {
    setItems((prev) => mergeCartItem(prev, item, quantity));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    if (!Number.isInteger(delta) || delta === 0) return;

    setItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalCount = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const totalAmount = useMemo(() => {
    const rawTotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    return Math.round(rawTotal * 100) / 100;
  }, [items]);

  const cartValue = useMemo<CartContextValue>(
    () => ({
      items,
      totalCount,
      totalAmount,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [items, totalCount, totalAmount, addToCart, updateQuantity, removeFromCart, clearCart]
  );

  const favoriteIds = useMemo(
    () => new Set(favorites.map((fav) => fav.productId)),
    [favorites]
  );

  const addToFavorites = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      if (prev.some((existing) => existing.productId === item.productId)) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const removeFromFavorites = useCallback((productId: string) => {
    setFavorites((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((existing) => existing.productId === item.productId);
      return exists
        ? prev.filter((existing) => existing.productId !== item.productId)
        : [...prev, item];
    });
  }, []);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.has(productId),
    [favoriteIds]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const moveAllFavoritesToCart = useCallback((): MoveFavoritesToCartResult => {
    const currentFavorites = favoritesRef.current;
    const transferredItems: CartItem[] = [];
    const pendingFavorites: FavoriteItem[] = [];

    for (const fav of currentFavorites) {
      if (hasCompleteVariant(fav)) {
        transferredItems.push(favoriteToCartItem(fav));
      } else {
        pendingFavorites.push(fav);
      }
    }

    if (transferredItems.length > 0) {
      favoritesRef.current = pendingFavorites;
      setItems((prev) =>
        transferredItems.reduce((acc, nextItem) => mergeCartItem(acc, nextItem, 1), prev)
      );
      setFavorites(pendingFavorites);
    }

    return {
      transferredCount: transferredItems.length,
      transferredItems,
      pendingFavorites,
    };
  }, []);

  const favoritesValue = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      favoritesCount: favorites.length,
      addToFavorites,
      removeFromFavorites,
      toggleFavorite,
      isFavorite,
      clearFavorites,
      moveAllFavoritesToCart,
    }),
    [
      favorites,
      addToFavorites,
      removeFromFavorites,
      toggleFavorite,
      isFavorite,
      clearFavorites,
      moveAllFavoritesToCart,
    ]
  );

  return (
    <CartContext.Provider value={cartValue}>
      <FavoritesContext.Provider value={favoritesValue}>{children}</FavoritesContext.Provider>
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart deve ser utilizado dentro de um StoreProvider.");
  }
  return context;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites deve ser utilizado dentro de um StoreProvider.");
  }
  return context;
}
