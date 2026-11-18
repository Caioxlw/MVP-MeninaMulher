import { MessageCircle, Minus, Plus, Trash2, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Badge, Button, EmptyState, Input, Modal } from "../../components/ui";
import { useCart } from "../../contexts/StoreContext";
import { ROUTES, type RouteDescriptor } from "../../routes/routes.config";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * C09 / Desktop Sacola de Compras (/sacola)
 */
export function StoreBagScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const navigate = useNavigate();
  const { items, totalCount, totalAmount, updateQuantity, removeFromCart, clearCart } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const whatsappMessageLines = [
    "Olá, Menina Mulher Lingerie! Gostaria de fazer o pedido:",
    ...items.map(
      (item) =>
        `- ${item.quantity}x ${item.name} (${item.color}, Tam ${item.size}) - ${formatBRL(
          item.unitPrice * item.quantity
        )}`
    ),
    "Forma de envio: A definir no WhatsApp",
    customerName.trim() ? `Cliente: ${customerName.trim()}` : null,
    notes.trim() ? `Obs: ${notes.trim()}` : null,
    `Total: ${formatBRL(totalAmount)}`,
  ].filter(Boolean);

  const countLabel = totalCount === 1 ? "1 item selecionado" : `${totalCount} itens selecionados`;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      {/* Cabeçalho da Sacola */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs text-brand-muted mb-1">
            Início / <strong className="text-brand-primary">Minha Sacola</strong>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-bold text-brand-plum">
              {descriptor.title}
            </h1>
            <Badge variant="blush">{countLabel}</Badge>
          </div>
        </div>
        <Badge variant="neutral">Compra direta sem cadastro • Pedido 100% via WhatsApp</Badge>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Sua sacola está vazia"
          description="Explore o catálogo da Menina Mulher para adicionar suas peças favoritas e enviar o pedido pronto pelo WhatsApp."
          actionLabel="Explorar Catálogo"
          onAction={() => navigate(ROUTES.store.home)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          {/* Coluna Esquerda: Lista de Itens na Sacola */}
          <section className="md:col-span-7 space-y-4">
            <Alert variant="info" title="Seus itens ficam salvos no seu navegador!">
              Não precisa criar conta nem fazer login. Sua seleção continua esperando por você com
              todo o carinho.
            </Alert>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                className="touch-target inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-brand-muted hover:text-status-danger hover:bg-brand-soft transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar sacola
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => {
                const imageKey = item.imageUrl ? `${item.id}:${item.imageUrl}` : "";
                const showImage = Boolean(item.imageUrl) && !failedImages[imageKey];
                return (
                  <article
                    key={item.id}
                    className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-center gap-4">
                      {showImage ? (
                        <img
                          src={item.imageUrl}
                          alt={item.imageAlt || item.name}
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [imageKey]: true }))
                          }
                          className="w-20 h-24 object-cover rounded-xl bg-brand-soft border border-brand-border shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-24 rounded-xl bg-brand-soft border border-brand-border flex flex-col items-center justify-center p-2 shrink-0">
                          <span className="text-[9px] font-bold uppercase text-brand-primary text-center leading-tight mb-1">
                            {item.category}
                          </span>
                          <span className="font-editorial font-bold text-brand-plum">MM</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <h2 className="font-editorial text-base sm:text-lg font-bold text-brand-plum">
                          {item.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
                          <span
                            className="w-3 h-3 rounded-full border border-brand-border shrink-0"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          <span>
                            Cor: <strong className="text-text-primary">{item.color}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Tamanho: <strong className="text-text-primary">{item.size}</strong>
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1 bg-brand-soft border border-brand-border rounded-xl p-1 mt-1">
                          <button
                            type="button"
                            aria-label={`Diminuir quantidade de ${item.name}`}
                            onClick={() => updateQuantity(item.id, -1)}
                            className="touch-target rounded-lg bg-brand-surface text-brand-plum inline-flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="min-w-[28px] text-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Aumentar quantidade de ${item.name}`}
                            onClick={() => updateQuantity(item.id, 1)}
                            className="touch-target rounded-lg bg-brand-surface text-brand-plum inline-flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between self-stretch">
                      <button
                        type="button"
                        aria-label={`Remover ${item.name} da sacola`}
                        onClick={() => removeFromCart(item.id)}
                        className="touch-target inline-flex items-center justify-center text-brand-muted hover:text-status-danger rounded-xl cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="text-right">
                        {item.quantity > 1 && (
                          <span className="text-[11px] text-brand-muted block">
                            {item.quantity}x {formatBRL(item.unitPrice)}
                          </span>
                        )}
                        <span className="font-editorial text-lg font-bold text-brand-plum">
                          {formatBRL(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Coluna Direita: Resumo do Pedido & Prévia Automática do WhatsApp */}
          <section className="md:col-span-5 bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <h2 className="font-editorial text-xl font-bold text-brand-plum">Resumo do Pedido</h2>
              <Badge variant="neutral">ETAPA FINAL</Badge>
            </div>

            <div className="bg-brand-soft/60 rounded-xl p-4 space-y-3 border border-brand-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">
                  Subtotal ({totalCount} {totalCount === 1 ? "peça" : "peças"})
                </span>
                <strong className="text-text-primary">{formatBRL(totalAmount)}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">Envio & Entrega</span>
                <span className="font-bold text-brand-primary">A definir no WhatsApp</span>
              </div>

              <div className="pt-3 border-t border-brand-border flex items-baseline justify-between">
                <span className="text-sm font-bold text-brand-plum">Total estimado</span>
                <span className="font-editorial text-2xl font-bold text-brand-primary">
                  {formatBRL(totalAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                label="Seu nome ou apelido (opcional)"
                placeholder="Ex.: Amanda Ferreira"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
              />
              <Input
                label="Observações do pedido (opcional)"
                placeholder="Ex.: Embalagem para presente, tirar etiqueta..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Prévia da Mensagem do WhatsApp (RF08, RF09) */}
            <div className="bg-status-success-bg/50 border border-status-success/25 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-status-success">
                  💬 PRÉVIA DA MENSAGEM DO WHATSAPP
                </span>
                <Badge variant="available">Automática</Badge>
              </div>
              <pre className="text-xs text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
                {whatsappMessageLines.join("\n")}
              </pre>
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={() =>
                window.open(
                  `https://wa.me/5511987654321?text=${encodeURIComponent(
                    whatsappMessageLines.join("\n")
                  )}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              <MessageCircle className="w-4 h-4" />
              Enviar Pedido pelo WhatsApp
            </Button>

            <p className="text-[11px] text-brand-muted text-center">
              🔒 <strong>Nenhum pagamento é cobrado online.</strong> A dona da boutique confirmará
              as peças em estoque e combinará a entrega no WhatsApp.
            </p>
          </section>
        </div>
      )}

      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        subtitle="CONFIRMAÇÃO"
        title="Limpar sacola?"
        description="Todas as peças selecionadas serão removidas da sua sacola."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsClearModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                clearCart();
                setIsClearModalOpen(false);
              }}
            >
              Sim, limpar sacola
            </Button>
          </>
        }
      />
    </div>
  );
}
