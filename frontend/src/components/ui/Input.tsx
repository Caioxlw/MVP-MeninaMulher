import { type InputHTMLAttributes, type ReactNode, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  rightLabel?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

/**
 * Componente base de Campo de Texto da Menina Mulher (PBI #69 — RNF01, RNF07).
 * Possui altura mínima de 44px, suporte a rótulo principal/secundário, ícones e estado de erro acessível.
 *
 * @example
 * ```tsx
 * <Input
 *   label="E-mail Corporativo"
 *   rightLabel="Proprietária"
 *   placeholder="contato@meninamulher.com.br"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 * />
 * ```
 */
export function Input({
  label,
  rightLabel,
  helperText,
  error,
  leftIcon,
  rightElement,
  id,
  className = "",
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={`w-full space-y-1.5 ${className}`.trim()}>
      {(label || rightLabel) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={inputId} className="text-xs sm:text-sm font-semibold text-text-primary">
              {label}
            </label>
          )}
          {rightLabel && (
            <span className="text-xs font-semibold text-brand-primary">{rightLabel}</span>
          )}
        </div>
      )}

      <div
        className={`flex items-center min-h-[44px] rounded-xl bg-brand-soft border px-3.5 transition-colors ${
          error
            ? "border-status-danger bg-status-danger-bg/30"
            : "border-brand-border focus-within:border-brand-primary focus-within:bg-brand-surface"
        }`}
      >
        {leftIcon && (
          <span className="inline-flex text-brand-muted shrink-0 mr-2.5">{leftIcon}</span>
        )}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className="w-full min-h-[44px] bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-brand-muted"
          {...rest}
        />
        {rightElement && (
          <span className="inline-flex items-center shrink-0 ml-2">{rightElement}</span>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-status-danger">
          {error}
        </p>
      ) : (
        helperText && (
          <p id={helperId} className="text-xs text-brand-muted">
            {helperText}
          </p>
        )
      )}
    </div>
  );
}
