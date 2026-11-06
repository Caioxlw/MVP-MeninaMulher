import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "brand" | "blush" | "available" | "lowStock" | "outOfStock" | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  icon?: ReactNode;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  brand: "bg-brand-primary text-white border-transparent",
  blush: "bg-brand-blush text-brand-plum border-brand-primary/15",
  available: "bg-status-success-bg text-status-success border-status-success/20",
  lowStock: "bg-status-warning-bg text-status-warning border-status-warning/25",
  outOfStock: "bg-status-danger-bg text-status-danger border-status-danger/20",
  neutral: "bg-brand-soft text-brand-plum border-brand-border",
};

/**
 * Componente base de Etiqueta de Status (Badge) da Menina Mulher (PBI #69).
 * Utilizado para disponibilidade de estoque (RF05), status de pedidos (RF14/RF15) e selos de coleção.
 *
 * @example
 * ```tsx
 * <Badge variant="available" dot>Disponível</Badge>
 * <Badge variant="lowStock">Últimas unidades</Badge>
 * <Badge variant="outOfStock">Esgotado</Badge>
 * ```
 */
export function Badge({
  variant = "blush",
  dot = false,
  icon,
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${BADGE_VARIANTS[variant]} ${className}`.trim()}
      {...rest}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
