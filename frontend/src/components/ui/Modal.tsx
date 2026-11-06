import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Componente base de Janela / Modal da Menina Mulher (PBI #69 — RNF01, RNF07).
 * Fiel ao modal de confirmação de reserva e baixa no estoque do protótipo.
 * Suporta fechamento por tecla Escape, clique no overlay e botão fechar de 44px.
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   subtitle="CONFIRMAÇÃO DE RESERVA • PEDIDO #1042"
 *   title="Confirmar Pedido & Baixa no Estoque"
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Voltar</Button>
 *       <Button variant="primary" onClick={handleConfirm}>Sim, Confirmar Pedido</Button>
 *     </>
 *   }
 * >
 *   <p>As peças serão debitadas automaticamente do estoque.</p>
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  icon,
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        data-testid="modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-brand-surface border border-brand-border p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon && (
              <span className="w-11 h-11 rounded-2xl bg-brand-blush text-brand-primary inline-flex items-center justify-center shrink-0">
                {icon}
              </span>
            )}
            <div>
              {subtitle && (
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-primary mb-0.5">
                  {subtitle}
                </p>
              )}
              <h2 className="font-editorial text-xl sm:text-2xl font-bold text-brand-plum leading-snug">
                {title}
              </h2>
              {description && (
                <p className="text-xs sm:text-sm text-text-secondary mt-1">{description}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela modal"
            className="touch-target rounded-xl text-brand-muted hover:text-brand-plum hover:bg-brand-soft inline-flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children && <div className="text-sm text-text-primary">{children}</div>}

        {footer && (
          <div className="pt-3 border-t border-brand-border flex flex-wrap items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
