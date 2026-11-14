import type { ProductVariant } from "@prisma/client";

export type AvailabilityStatus = "OUT_OF_STOCK" | "LOW_STOCK" | "AVAILABLE";
export type AvailabilityLabel = "esgotado" | "últimas unidades" | "disponível";

export const DEFAULT_LOW_STOCK_THRESHOLD = 3;

export interface VariantAvailabilityFields {
  availabilityStatus: AvailabilityStatus;
  availabilityLabel: AvailabilityLabel;
  available: boolean;
}

export type VariantWithAvailability<T extends { stock: number } = ProductVariant> = T &
  VariantAvailabilityFields;

/**
 * Calcula dinamicamente o status de disponibilidade de uma variação a partir do saldo em estoque
 * (`RF05`, `RNF09`, PBI #21).
 */
export function resolveVariantAvailability(
  rawStock: number,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD
): VariantAvailabilityFields {
  const stock = Number.isFinite(rawStock) ? Math.max(0, Math.trunc(rawStock)) : 0;

  if (stock === 0) {
    return {
      availabilityStatus: "OUT_OF_STOCK",
      availabilityLabel: "esgotado",
      available: false,
    };
  }

  if (stock <= lowStockThreshold) {
    return {
      availabilityStatus: "LOW_STOCK",
      availabilityLabel: "últimas unidades",
      available: true,
    };
  }

  return {
    availabilityStatus: "AVAILABLE",
    availabilityLabel: "disponível",
    available: true,
  };
}

/**
 * Anexa os campos calculados de disponibilidade à variação preservando seus demais atributos.
 */
export function withVariantAvailability<T extends { stock: number }>(
  variant: T,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD
): VariantWithAvailability<T> {
  return {
    ...variant,
    ...resolveVariantAvailability(variant.stock, lowStockThreshold),
  };
}

/**
 * Enriquece as variações de um produto com os campos de disponibilidade sem alterar objetos sem `variants`.
 */
export function withProductVariantsAvailability<T extends object>(
  product: T & { variants?: Array<{ stock: number }> },
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD
): T {
  if (!Array.isArray(product.variants)) {
    return product;
  }

  return {
    ...product,
    variants: product.variants.map((variant) =>
      withVariantAvailability(variant, lowStockThreshold)
    ),
  };
}
