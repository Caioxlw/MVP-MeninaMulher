import { RefreshCw, ShoppingBag } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Badge, Button, EmptyState } from "../../components/ui";
import { ROUTES, type RouteDescriptor } from "../../routes/routes.config";
import {
  type AdminOrder,
  type OrderStatusFilter,
  OrdersApiError,
  type OrdersPaginationMeta,
  formatOrderDateTime,
  formatOrderNumber,
  getAdminOrders,
  getOrderStatusMeta,
  sortOrdersNewestFirst,
} from "../../services/ordersApi";
import { formatPriceBRL } from "../../services/productsApi";

export interface AdminOrdersScreenProps {
  descriptor: RouteDescriptor;
  renderOrderActions?: (order: AdminOrder) => ReactNode;
}

const ORDER_STATUS_FILTERS: Array<{ id: OrderStatusFilter; label: string }> = [
  { id: "ALL", label: "Todos" },
  { id: "PENDING", label: "Pendentes" },
  { id: "CONFIRMED", label: "Confirmados" },
  { id: "CANCELLED", label: "Cancelados" },
];

const EMPTY_COPY_BY_FILTER: Record<
  OrderStatusFilter,
  { title: string; description: string; actionLabel: string }
> = {
  ALL: {
    title: "Nenhum pedido registrado",
    description:
      "Os pedidos enviados pelas clientes pelo WhatsApp aparecerão aqui assim que forem registrados.",
    actionLabel: "Atualizar lista",
  },
  PENDING: {
    title: "Nenhum pedido pendente",
    description: "Não há pedidos aguardando confirmação neste momento.",
    actionLabel: "Ver todos os pedidos",
  },
  CONFIRMED: {
    title: "Nenhum pedido confirmado",
    description: "Nenhum pedido confirmado foi encontrado para este filtro.",
    actionLabel: "Ver todos os pedidos",
  },
  CANCELLED: {
    title: "Nenhum pedido cancelado",
    description: "Nenhum pedido cancelado foi encontrado para este filtro.",
    actionLabel: "Ver todos os pedidos",
  },
};

function OrdersLoadingSkeleton() {
  return (
    <div role="status" aria-label="Carregando pedidos" className="space-y-4">
      <span className="sr-only">Carregando pedidos...</span>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 animate-pulse space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-brand-border/60">
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 rounded-md bg-brand-soft" />
              <div className="h-5 w-24 rounded-full bg-brand-soft" />
              <div className="h-4 w-32 rounded-md bg-brand-soft" />
            </div>
            <div className="h-6 w-24 rounded-md bg-brand-soft" />
          </div>
          <div className="space-y-2.5">
            <div className="h-4 w-2/3 rounded-md bg-brand-soft" />
            <div className="h-4 w-1/2 rounded-md bg-brand-soft" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminOrdersScreen({ descriptor, renderOrderActions }: AdminOrdersScreenProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [meta, setMeta] = useState<OrdersPaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const redirectToLogin = useCallback(() => {
    navigate(ROUTES.admin.login, {
      replace: true,
      state: { from: location.pathname },
    });
  }, [navigate, location.pathname]);

  useEffect(() => {
    let active = true;

    getAdminOrders(statusFilter === "ALL" ? {} : { status: statusFilter })
      .then((result) => {
        if (!active) return;
        setOrders(sortOrdersNewestFirst(result.data));
        setMeta(result.meta);
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof OrdersApiError && err.code === "UNAUTHORIZED") {
          redirectToLogin();
          return;
        }
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os pedidos. Tente novamente."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [statusFilter, reloadTick, redirectToLogin]);

  const handleFilterChange = (nextFilter: OrderStatusFilter) => {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusFilter(nextFilter);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadTick((tick) => tick + 1);
  };

  const emptyCopy = EMPTY_COPY_BY_FILTER[statusFilter];

  return (
    <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Cabeçalho editorial direto sobre a superfície da página */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-brand-border">
        <div className="space-y-1">
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum">
            {descriptor.title}
          </h1>
          <p className="text-sm text-text-secondary max-w-2xl">{descriptor.subtitle}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isLoading && !errorMessage && (
            <span className="text-xs sm:text-sm font-medium text-text-secondary tabular-nums">
              {meta.total} {meta.total === 1 ? "pedido" : "pedidos"}
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />}
          >
            Atualizar
          </Button>
        </div>
      </header>

      {/* Barra de filtros por status */}
      <div
        role="group"
        aria-label="Filtrar pedidos por status"
        className="flex flex-wrap items-center gap-2"
      >
        {ORDER_STATUS_FILTERS.map((filter) => {
          const isSelected = statusFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => handleFilterChange(filter.id)}
              aria-pressed={isSelected}
              className={`min-h-11 px-4 py-2 rounded-full text-sm font-semibold border transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
                isSelected
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-brand-surface text-brand-plum border-brand-border hover:bg-brand-soft"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Área principal: carregamento, erro, vazio ou lista de pedidos */}
      {isLoading ? (
        <OrdersLoadingSkeleton />
      ) : errorMessage ? (
        <Alert
          variant="error"
          title="Não foi possível carregar os pedidos"
          action={
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              Tentar novamente
            </Button>
          }
        >
          {errorMessage}
        </Alert>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-6 h-6" />}
          title={emptyCopy.title}
          description={emptyCopy.description}
          actionLabel={emptyCopy.actionLabel}
          onAction={() => {
            if (statusFilter === "ALL") {
              handleRetry();
            } else {
              handleFilterChange("ALL");
            }
          }}
        />
      ) : (
        <section aria-label="Lista de pedidos registrados" className="space-y-4">
          {orders.map((order) => {
            const statusMeta = getOrderStatusMeta(order.status);
            const totalPieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const actionsNode = renderOrderActions?.(order);

            return (
              <article
                key={order.id}
                data-testid={`order-card-${order.id}`}
                data-order-status={order.status}
                className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden"
              >
                {/* Cabeçalho do pedido */}
                <div className="px-4 sm:px-6 py-4 border-b border-brand-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-sans text-lg font-bold text-brand-plum tabular-nums">
                      {formatOrderNumber(order.orderNumber)}
                    </span>
                    <Badge variant={statusMeta.variant} dot>
                      {statusMeta.label}
                    </Badge>
                    <span className="text-xs sm:text-sm text-text-secondary tabular-nums">
                      {formatOrderDateTime(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between sm:justify-end gap-3">
                    <span className="text-xs text-text-secondary tabular-nums">
                      {totalPieces} {totalPieces === 1 ? "peça" : "peças"}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-text-primary tabular-nums">
                      {formatPriceBRL(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Lista de itens separada por linhas sutis (sem caixas aninhadas) */}
                <ul
                  aria-label={`Itens do pedido ${formatOrderNumber(order.orderNumber)}`}
                  className="divide-y divide-brand-border/60 px-4 sm:px-6"
                >
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs sm:text-sm text-text-secondary">
                          Tam: {item.size} · Cor: {item.color}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 tabular-nums">
                        <span className="text-xs sm:text-sm text-text-secondary">
                          {item.quantity} un. × {formatPriceBRL(item.unitPrice)}
                        </span>
                        <span className="text-sm font-semibold text-text-primary">
                          {formatPriceBRL(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Container preparado para ações de confirmação/cancelamento (PBI #98) */}
                <div
                  data-testid={`order-actions-${order.id}`}
                  className={
                    actionsNode
                      ? "px-4 sm:px-6 py-3.5 border-t border-brand-border/70 bg-brand-soft/40 flex flex-wrap items-center justify-end gap-2"
                      : undefined
                  }
                >
                  {actionsNode}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
