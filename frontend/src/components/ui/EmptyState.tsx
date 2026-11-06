import { Heart } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Componente base de Estado Vazio (EmptyState) da Menina Mulher (PBI #69).
 * Fiel ao card "Tudo em harmonia" do Painel e aos estados vazios da Sacola e Favoritos.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="Tudo em harmonia"
 *   description="Apenas 2 pedidos aguardando seu carinho hoje."
 *   actionLabel="Ver Catálogo"
 *   onAction={() => navigate("/catalogo")}
 * />
 * ```
 */
export function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <section
      data-testid="empty-state"
      className="bg-brand-soft border border-brand-border rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3"
    >
      <span className="w-14 h-14 rounded-full bg-brand-blush text-brand-primary inline-flex items-center justify-center">
        {icon ?? <Heart className="w-6 h-6 fill-brand-primary" />}
      </span>

      <h3 className="font-editorial text-xl sm:text-2xl font-bold text-brand-plum">{title}</h3>
      <p className="text-xs sm:text-sm text-brand-muted max-w-md">{description}</p>

      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
