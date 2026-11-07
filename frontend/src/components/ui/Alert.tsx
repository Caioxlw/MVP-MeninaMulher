import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps {
  variant?: AlertVariant;
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
}

const ALERT_STYLES: Record<AlertVariant, { container: string; iconWrap: string }> = {
  info: {
    container: "bg-brand-blush/45 border-brand-primary/25 text-brand-plum",
    iconWrap: "bg-brand-primary text-white",
  },
  success: {
    container: "bg-status-success-bg border-status-success/25 text-status-success",
    iconWrap: "bg-status-success text-white",
  },
  warning: {
    container: "bg-status-warning-bg border-status-warning/25 text-status-warning",
    iconWrap: "bg-status-warning text-white",
  },
  error: {
    container: "bg-status-danger-bg border-status-danger/25 text-status-danger",
    iconWrap: "bg-status-danger text-white",
  },
};

function defaultIcon(variant: AlertVariant) {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="w-4 h-4" />;
    case "warning":
      return <TriangleAlert className="w-4 h-4" />;
    case "error":
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
}

/**
 * Componente base de Aviso Rápido (Alert / Banner contextual) da Menina Mulher (PBI #69).
 * Utilizado em avisos de login, alertas de falta de estoque na sacola e confirmação de sincronização.
 *
 * @example
 * ```tsx
 * <Alert variant="error" title="Credenciais não reconhecidas">
 *   E-mail ou senha incorretos. Verifique os dados digitados e tente novamente.
 * </Alert>
 * ```
 */
export function Alert({ variant = "info", title, children, icon, action, onClose }: AlertProps) {
  const styles = ALERT_STYLES[variant];

  return (
    <div
      role="alert"
      className={`rounded-2xl border p-4 flex items-start justify-between gap-3 ${styles.container}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 mt-0.5 ${styles.iconWrap}`}
        >
          {icon ?? defaultIcon(variant)}
        </span>
        <div className="space-y-1">
          <p className="text-sm font-bold leading-snug">{title}</p>
          {children && <div className="text-xs sm:text-sm opacity-90">{children}</div>}
          {action && <div className="pt-1.5">{action}</div>}
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar aviso"
          className="touch-target rounded-xl inline-flex items-center justify-center shrink-0 hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
