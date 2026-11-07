import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand-primary text-white border-transparent hover:bg-brand-primary-hover shadow-xs",
  secondary: "bg-brand-surface text-brand-plum border-brand-border hover:bg-brand-soft",
  outline: "bg-transparent text-brand-plum border-brand-plum hover:bg-brand-blush/30",
  ghost: "bg-transparent text-brand-plum border-transparent hover:bg-brand-soft",
  danger:
    "bg-status-danger-bg text-status-danger border-status-danger/20 hover:bg-status-danger hover:text-white",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-[44px] px-3.5 py-2 text-xs rounded-xl",
  md: "min-h-[44px] px-5 py-2.5 text-sm rounded-xl",
  lg: "min-h-[48px] px-6 py-3 text-base rounded-2xl",
};

/**
 * Componente base de Botão da Menina Mulher (PBI #69 — RNF01, RNF07).
 * Garante área mínima de toque de 44px de altura e contraste acessível (>= 4.5:1).
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleConfirm}>
 *   Confirmar Pedido & Baixar Estoque
 * </Button>
 * <Button variant="secondary" onClick={handleCancel}>
 *   Voltar
 * </Button>
 * ```
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`touch-target inline-flex items-center justify-center gap-2 font-semibold border transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`.trim()}
      {...rest}
    >
      {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      <span>{loading ? "Carregando..." : children}</span>
      {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
}
