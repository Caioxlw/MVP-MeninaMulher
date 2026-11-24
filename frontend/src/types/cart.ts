export interface CartItem {
  /** Identificador único do item na sacola (ex.: `${productId}-${variantId}`) */
  id: string;
  /** ID ou slug do produto */
  productId: string;
  /** ID da variação (ProductVariant) para rastreabilidade com o estoque do back-end */
  variantId: string;
  name: string;
  category: string;
  color: string;
  colorHex: string;
  size: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  imageAlt: string;
}

export type AddToCartInput = Omit<CartItem, "quantity" | "id"> & {
  id?: string;
};

export interface FavoriteItem {
  productId: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
  imageAlt: string;
  /** Campos opcionais da variante padrão para suportar transferência direta à sacola */
  variantId?: string;
  color?: string;
  colorHex?: string;
  size?: string;
}

export interface MoveFavoritesToCartResult {
  transferredCount: number;
  transferredItems: CartItem[];
  pendingFavorites: FavoriteItem[];
}

export interface CartContextValue {
  items: CartItem[];
  totalCount: number;
  totalAmount: number;
  addToCart: (item: AddToCartInput, quantity?: number) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

export interface FavoritesContextValue {
  favorites: FavoriteItem[];
  favoritesCount: number;
  addToFavorites: (item: FavoriteItem) => void;
  removeFromFavorites: (productId: string) => void;
  toggleFavorite: (item: FavoriteItem) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
  moveAllFavoritesToCart: () => MoveFavoritesToCartResult;
}
