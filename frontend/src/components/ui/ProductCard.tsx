import { Ban, Heart, ShoppingBag } from "lucide-react";
import { Badge, type BadgeVariant } from "./Badge";
import { Button } from "./Button";

export type ProductStockStatus = "available" | "low_stock" | "out_of_stock";

export interface ProductCardProps {
  id: string;
  name: string;
  category: string;
  subtitle?: string;
  price: number | string;
  installmentText?: string;
  imageUrl?: string;
  imageAlt?: string;
  sizes?: string[];
  colors?: string[];
  badgeText?: string;
  badgeVariant?: BadgeVariant;
  stockStatus?: ProductStockStatus;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onAction?: (id: string) => void;
  actionLabel?: string;
}

function formatPrice(value: number | string): string {
  if (typeof value === "string") return value;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function resolveBadge(
  stockStatus: ProductStockStatus,
  badgeText?: string,
  badgeVariant?: BadgeVariant
): { label: string; variant: BadgeVariant } | null {
  if (stockStatus === "out_of_stock") {
    return { label: badgeText ?? "Esgotado", variant: "outOfStock" };
  }
  if (stockStatus === "low_stock") {
    return { label: badgeText ?? "Últimas unidades", variant: "lowStock" };
  }
  if (badgeText) {
    return { label: badgeText, variant: badgeVariant ?? "brand" };
  }
  return null;
}

/**
 * Componente base de Cartão de Produto da Menina Mulher (PBI #69 — RF02, RF05, RNF01, RNF07).
 * Exibe foto com texto alternativo, etiqueta de status/estoque, botão de favoritar (>= 44px),
 * tamanhos/cores disponíveis, preço e botão de compra/indisponibilidade.
 *
 * @example
 * ```tsx
 * <ProductCard
 *   id="sutia-renda-noir"
 *   name="Sutiã Renda Noir"
 *   category="Partes de Cima"
 *   subtitle="Toque aveludado e suave"
 *   price={119.9}
 *   installmentText="3x s/ juros"
 *   sizes={["P", "M", "G"]}
 *   colors={["#23101B", "#F5CCD0"]}
 *   badgeText="Novo"
 *   onAction={(id) => navigate(`/produto/${id}`)}
 * />
 * ```
 */
export function ProductCard({
  id,
  name,
  category,
  subtitle,
  price,
  installmentText = "À vista",
  imageUrl,
  imageAlt,
  sizes = [],
  colors = [],
  badgeText,
  badgeVariant,
  stockStatus = "available",
  isFavorite = false,
  onToggleFavorite,
  onAction,
  actionLabel = "Comprar Agora",
}: ProductCardProps) {
  const isOutOfStock = stockStatus === "out_of_stock";
  const resolvedBadge = resolveBadge(stockStatus, badgeText, badgeVariant);

  return (
    <article
      data-testid={`product-card-${id}`}
      className="bg-brand-surface border border-brand-border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-xs hover:border-brand-primary/30 transition-colors"
    >
      <div>
        {/* Moldura da Foto + Etiqueta + Favorito */}
        <div className="relative aspect-3/4 rounded-xl bg-brand-soft border border-brand-border overflow-hidden mb-3 flex flex-col justify-between p-2.5">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={imageAlt ?? name}
              loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover ${
                isOutOfStock ? "grayscale opacity-65" : ""
              }`}
            />
          ) : (
            <div
              role="img"
              aria-label={imageAlt ?? name}
              className="absolute inset-0 flex items-center justify-center bg-brand-soft text-brand-plum/35 font-editorial text-2xl font-bold select-none"
            >
              MM
            </div>
          )}

          <div className="relative z-10 flex items-start justify-between gap-2">
            <div>
              {resolvedBadge && (
                <Badge variant={resolvedBadge.variant}>{resolvedBadge.label}</Badge>
              )}
            </div>

            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(id)}
                aria-label={
                  isFavorite ? `Remover ${name} dos favoritos` : `Adicionar ${name} aos favoritos`
                }
                aria-pressed={isFavorite}
                className="touch-target rounded-full bg-brand-surface/90 border border-brand-border inline-flex items-center justify-center text-brand-primary shadow-xs hover:bg-brand-surface"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-brand-primary" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Categoria, Nome e Subtítulo */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
          {category}
        </p>
        <h3 className="font-editorial text-sm sm:text-base font-bold text-brand-plum leading-snug">
          {name}
        </h3>
        {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}

        {/* Cores e Tamanhos Disponíveis */}
        {(colors.length > 0 || sizes.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
            {colors.length > 0 && (
              <div className="flex items-center gap-1" aria-label="Cores disponíveis">
                {colors.map((colorHex) => (
                  <span
                    key={colorHex}
                    style={{ backgroundColor: colorHex }}
                    className="w-3 h-3 rounded-full border border-brand-border inline-block"
                  />
                ))}
              </div>
            )}
            {sizes.length > 0 && (
              <span className="text-[11px] font-medium text-brand-muted">
                Tam: {sizes.join(", ")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Preço + Botão de Ação (>= 44px) */}
      <div className="mt-3 pt-3 border-t border-brand-border space-y-2.5">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-sm sm:text-base font-bold text-brand-primary">
            {formatPrice(price)}
          </span>
          <span className="text-[10px] text-brand-muted">{installmentText}</span>
        </div>

        <Button
          variant={isOutOfStock ? "secondary" : "primary"}
          size="sm"
          fullWidth
          disabled={isOutOfStock}
          leftIcon={
            isOutOfStock ? <Ban className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />
          }
          onClick={() => onAction?.(id)}
        >
          {isOutOfStock ? "Indisponível" : actionLabel}
        </Button>
      </div>
    </article>
  );
}
