import type { CartItem, FavoriteItem } from "../types/cart";

export const CART_STORAGE_KEY = "menina_mulher_cart_v1";
export const FAVORITES_STORAGE_KEY = "menina_mulher_favorites_v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isValidCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.productId) &&
    isNonEmptyString(value.variantId) &&
    isNonEmptyString(value.name) &&
    typeof value.category === "string" &&
    isNonEmptyString(value.color) &&
    typeof value.colorHex === "string" &&
    isNonEmptyString(value.size) &&
    isFiniteNonNegativeNumber(value.unitPrice) &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0 &&
    (value.imageUrl === undefined || typeof value.imageUrl === "string") &&
    typeof value.imageAlt === "string"
  );
}

export function isValidFavoriteItem(value: unknown): value is FavoriteItem {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.productId) &&
    isNonEmptyString(value.name) &&
    typeof value.category === "string" &&
    isFiniteNonNegativeNumber(value.price) &&
    (value.imageUrl === undefined || typeof value.imageUrl === "string") &&
    typeof value.imageAlt === "string" &&
    (value.variantId === undefined || typeof value.variantId === "string") &&
    (value.color === undefined || typeof value.color === "string") &&
    (value.colorHex === undefined || typeof value.colorHex === "string") &&
    (value.size === undefined || typeof value.size === "string")
  );
}

export function parseStorageList<T>(
  rawValue: string | null,
  validator: (value: unknown) => value is T
): T[] {
  if (!rawValue) return [];

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validator);
  } catch {
    return [];
  }
}

export function readStorageList<T>(
  key: string,
  validator: (value: unknown) => value is T
): T[] {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(key);
    return parseStorageList(rawValue, validator);
  } catch {
    return [];
  }
}

export function writeStorageList<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Fallback silencioso em memória caso o storage esteja indisponível ou sem cota
  }
}
