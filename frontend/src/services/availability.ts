import type { BadgeVariant } from "../components/ui/Badge";
import type { ProductStockStatus } from "../components/ui/ProductCard";
import { resolveColorHex } from "./stockApi";

export type AvailabilityLabel = "Disponível" | "Últimas unidades" | "Esgotado";

export interface VariationAvailabilityInfo {
  status: ProductStockStatus;
  label: AvailabilityLabel;
  badgeVariant: BadgeVariant;
  available: boolean;
  stock: number;
}

export interface StoreProductVariant {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
}

export interface ColorAvailabilityOption {
  color: string;
  colorHex: string;
  totalStock: number;
  availability: VariationAvailabilityInfo;
}

export interface SizeAvailabilityOption {
  id: string;
  size: string;
  color: string;
  stock: number;
  availability: VariationAvailabilityInfo;
}

/**
 * Calcula o status e a etiqueta textual acessível de disponibilidade (RF05, RNF07, PBI #97).
 */
export function resolveVariationAvailability(rawStock: number): VariationAvailabilityInfo {
  const stock = Number.isFinite(rawStock) ? Math.max(0, Math.trunc(rawStock)) : 0;

  if (stock === 0) {
    return {
      status: "out_of_stock",
      label: "Esgotado",
      badgeVariant: "outOfStock",
      available: false,
      stock: 0,
    };
  }

  if (stock <= 2) {
    return {
      status: "low_stock",
      label: "Últimas unidades",
      badgeVariant: "lowStock",
      available: true,
      stock,
    };
  }

  return {
    status: "available",
    label: "Disponível",
    badgeVariant: "available",
    available: true,
    stock,
  };
}

/**
 * Calcula a disponibilidade agregada de um produto a partir de suas variações.
 */
export function resolveProductOverallAvailability(
  variants: StoreProductVariant[]
): VariationAvailabilityInfo {
  const totalStock = variants.reduce((acc, v) => acc + Math.max(0, v.stock), 0);
  return resolveVariationAvailability(totalStock);
}

/**
 * Agrupa as cores do produto e calcula a disponibilidade de cada cor.
 */
export function getProductColorsAvailability(
  variants: StoreProductVariant[]
): ColorAvailabilityOption[] {
  const map = new Map<string, { colorHex: string; totalStock: number }>();

  for (const v of variants) {
    const current = map.get(v.color);
    if (current) {
      current.totalStock += Math.max(0, v.stock);
    } else {
      map.set(v.color, {
        colorHex: v.colorHex || resolveColorHex(v.color),
        totalStock: Math.max(0, v.stock),
      });
    }
  }

  return Array.from(map.entries()).map(([color, data]) => ({
    color,
    colorHex: data.colorHex,
    totalStock: data.totalStock,
    availability: resolveVariationAvailability(data.totalStock),
  }));
}

/**
 * Lista os tamanhos de uma cor específica com suas etiquetas de disponibilidade.
 */
export function getSizesAvailabilityForColor(
  variants: StoreProductVariant[],
  color: string
): SizeAvailabilityOption[] {
  return variants
    .filter((v) => v.color.toLowerCase() === color.trim().toLowerCase())
    .map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      stock: Math.max(0, v.stock),
      availability: resolveVariationAvailability(v.stock),
    }));
}

export const STORE_PRODUCT_VARIANTS_MAP: Record<string, StoreProductVariant[]> = {
  "sutia-renda-noir": [
    { id: "srn-pr-p", size: "P", color: "Preto", colorHex: "#23101B", stock: 4 },
    { id: "srn-pr-m", size: "M", color: "Preto", colorHex: "#23101B", stock: 2 },
    { id: "srn-pr-g", size: "G", color: "Preto", colorHex: "#23101B", stock: 0 },
    { id: "srn-gr-p", size: "P", color: "Grafite", colorHex: "#6F4F64", stock: 0 },
    { id: "srn-gr-m", size: "M", color: "Grafite", colorHex: "#6F4F64", stock: 3 },
    { id: "srn-gr-g", size: "G", color: "Grafite", colorHex: "#6F4F64", stock: 1 },
    { id: "srn-ro-p", size: "P", color: "Rosé", colorHex: "#F5CCD0", stock: 0 },
    { id: "srn-ro-m", size: "M", color: "Rosé", colorHex: "#F5CCD0", stock: 0 },
    { id: "srn-ro-g", size: "G", color: "Rosé", colorHex: "#F5CCD0", stock: 0 },
  ],
  "calcinha-algodao-doce": [
    { id: "cad-ro-p", size: "P", color: "Rosa", colorHex: "#F5CCD0", stock: 0 },
    { id: "cad-ro-m", size: "M", color: "Rosa", colorHex: "#F5CCD0", stock: 2 },
    { id: "cad-ro-g", size: "G", color: "Rosa", colorHex: "#F5CCD0", stock: 1 },
    { id: "cad-br-m", size: "M", color: "Branco", colorHex: "#FFFFFF", stock: 4 },
    { id: "cad-br-g", size: "G", color: "Branco", colorHex: "#FFFFFF", stock: 0 },
  ],
  "conjunto-microfibra-nude": [
    { id: "cmn-nu-p", size: "P", color: "Nude", colorHex: "#E5C3B5", stock: 1 },
    { id: "cmn-nu-m", size: "M", color: "Nude", colorHex: "#E5C3B5", stock: 2 },
    { id: "cmn-nu-g", size: "G", color: "Nude", colorHex: "#E5C3B5", stock: 0 },
    { id: "cmn-vi-p", size: "P", color: "Vinho", colorHex: "#520139", stock: 0 },
    { id: "cmn-vi-m", size: "M", color: "Vinho", colorHex: "#520139", stock: 0 },
  ],
  "body-renda-floral": [
    { id: "brf-pr-p", size: "P", color: "Preto", colorHex: "#23101B", stock: 0 },
    { id: "brf-pr-m", size: "M", color: "Preto", colorHex: "#23101B", stock: 0 },
    { id: "brf-pr-g", size: "G", color: "Preto", colorHex: "#23101B", stock: 0 },
  ],
};

export function getFallbackProductVariants(productId: string): StoreProductVariant[] {
  return (
    STORE_PRODUCT_VARIANTS_MAP[productId] ?? STORE_PRODUCT_VARIANTS_MAP["sutia-renda-noir"] ?? []
  );
}

export async function fetchStoreProductVariants(productId: string): Promise<StoreProductVariant[]> {
  try {
    const response = await fetch(`/api/products/${encodeURIComponent(productId)}/variants`);
    if (!response.ok) {
      return getFallbackProductVariants(productId);
    }
    const data = (await response.json()) as Array<{
      id: string;
      size: string;
      color: string;
      stock: number;
    }>;
    if (!Array.isArray(data) || data.length === 0) {
      return getFallbackProductVariants(productId);
    }
    return data.map((item) => ({
      id: item.id,
      size: item.size,
      color: item.color,
      colorHex: resolveColorHex(item.color),
      stock: item.stock,
    }));
  } catch {
    return getFallbackProductVariants(productId);
  }
}
