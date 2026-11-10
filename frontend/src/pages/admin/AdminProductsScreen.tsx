import {
  AlertTriangle,
  Edit3,
  Eye,
  EyeOff,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Badge, Button, EmptyState, Input, Modal } from "../../components/ui";
import { ROUTES, type RouteDescriptor } from "../../routes/routes.config";
import {
  DEMO_PRODUCTS,
  type Product,
  type ProductStatusFilter,
  ProductsApiError,
  applyDemoDeleteProduct,
  applyDemoUpdateProduct,
  countProductsByStatus,
  deleteProduct,
  filterProducts,
  formatPriceBRL,
  getAdminProducts,
  getTotalStock,
  toggleProductActive,
} from "../../services/productsApi";

export interface AdminProductsLocationState {
  flashMessage?: string;
}

const STATUS_TABS: Array<{ id: ProductStatusFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Ativos" },
  { id: "hidden", label: "Ocultos" },
  { id: "featured", label: "Destaques" },
];

export function AdminProductsScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = (location.state as AdminProductsLocationState | null) ?? null;

  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(
    locationState?.flashMessage ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictProduct, setConflictProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isMutatingId, setIsMutatingId] = useState<string | null>(null);

  useEffect(() => {
    if (locationState?.flashMessage) {
      setFeedbackMessage(locationState.flashMessage);
    }
  }, [locationState?.flashMessage]);

  useEffect(() => {
    let active = true;

    getAdminProducts()
      .then((result) => {
        if (!active) return;
        setProducts(result.data);
        setIsDemoMode(result.demo);
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ProductsApiError && err.code === "UNAUTHORIZED") {
          navigate(ROUTES.admin.login, {
            replace: true,
            state: { from: location.pathname },
          });
          return;
        }
        setErrorMessage(
          err instanceof Error ? err.message : "Não foi possível carregar os produtos do catálogo."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [location.pathname, navigate]);

  const counts = useMemo(() => countProductsByStatus(products), [products]);

  const filteredProducts = useMemo(
    () =>
      filterProducts(products, {
        status: statusFilter,
        search: searchQuery,
      }),
    [products, statusFilter, searchQuery]
  );

  const totalInventoryUnits = useMemo(
    () => products.reduce((sum, p) => sum + getTotalStock(p), 0),
    [products]
  );

  const handleToggleActive = async (product: Product) => {
    const nextActive = !product.active;
    setErrorMessage(null);
    setConflictProduct(null);
    setIsMutatingId(product.id);

    try {
      let updated: Product;
      try {
        updated = await toggleProductActive(product.id, nextActive);
      } catch (apiErr: unknown) {
        if (apiErr instanceof ProductsApiError && apiErr.code === "DEMO_READ_ONLY") {
          updated = applyDemoUpdateProduct(product.id, { active: nextActive });
          setIsDemoMode(true);
        } else {
          throw apiErr;
        }
      }

      setProducts((prev) => prev.map((item) => (item.id === product.id ? updated : item)));
      setFeedbackMessage(
        nextActive
          ? `"${updated.name}" foi reativado e já está visível na vitrine.`
          : `"${updated.name}" foi ocultado da vitrine pública com sucesso.`
      );
    } catch (err: unknown) {
      if (err instanceof ProductsApiError && err.code === "UNAUTHORIZED") {
        navigate(ROUTES.admin.login, {
          replace: true,
          state: { from: location.pathname },
        });
        return;
      }
      setErrorMessage(
        err instanceof Error ? err.message : "Não foi possível alterar a visibilidade do produto."
      );
    } finally {
      setIsMutatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setErrorMessage(null);
    setConflictProduct(null);
    setIsMutatingId(target.id);

    try {
      try {
        await deleteProduct(target.id);
      } catch (apiErr: unknown) {
        if (apiErr instanceof ProductsApiError && apiErr.code === "DEMO_READ_ONLY") {
          applyDemoDeleteProduct(target.id);
          setIsDemoMode(true);
        } else {
          throw apiErr;
        }
      }

      setProducts((prev) => prev.filter((item) => item.id !== target.id));
      setFeedbackMessage(`"${target.name}" foi excluído do catálogo com sucesso.`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteTarget(null);
      if (err instanceof ProductsApiError && err.code === "UNAUTHORIZED") {
        navigate(ROUTES.admin.login, {
          replace: true,
          state: { from: location.pathname },
        });
        return;
      }
      if (err instanceof ProductsApiError && err.code === "CONFLICT") {
        setConflictProduct(target);
        setErrorMessage(err.message);
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "Não foi possível excluir o produto.");
    } finally {
      setIsMutatingId(null);
    }
  };

  const handleHideConflictedProduct = async () => {
    if (!conflictProduct) return;
    const target = conflictProduct;
    setConflictProduct(null);
    await handleToggleActive({ ...target, active: true });
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {isDemoMode && (
        <Alert variant="warning" title="Modo Demonstração — API offline">
          Exibindo catálogo local de demonstração. As alterações feitas agora ficam salvas na
          memória desta sessão para teste completo dos fluxos.
        </Alert>
      )}

      {feedbackMessage && (
        <Alert
          variant="success"
          title="Catálogo Atualizado"
          onClose={() => setFeedbackMessage(null)}
        >
          {feedbackMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert
          variant="error"
          title={
            conflictProduct
              ? "Exclusão Bloqueada por Histórico de Pedidos"
              : "Não foi possível concluir a operação"
          }
          onClose={() => {
            setErrorMessage(null);
            setConflictProduct(null);
          }}
        >
          <div className="space-y-2.5">
            <p>{errorMessage}</p>
            {conflictProduct && conflictProduct.active && (
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleHideConflictedProduct()}
                >
                  <EyeOff className="w-4 h-4" />
                  Ocultar Produto Agora
                </Button>
              </div>
            )}
          </div>
        </Alert>
      )}

      {/* Cabeçalho da Gestão de Produtos */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant="blush">{counts.active} Produtos Ativos</Badge>
            <Badge variant="neutral">{counts.hidden} Ocultos</Badge>
            <span className="text-xs text-brand-muted">Rota: {location.pathname}</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum">
            {descriptor.title}
          </h1>
          <p className="text-sm text-text-secondary">{descriptor.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="primary" onClick={() => navigate(ROUTES.admin.newProduct)}>
            <Plus className="w-4 h-4" />
            Cadastrar Novo Produto
          </Button>
        </div>
      </section>

      {/* Indicadores Rápidos */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
              TOTAL CADASTRADO
            </span>
            <p className="font-editorial text-xl sm:text-2xl font-bold text-text-primary mt-1">
              {counts.all} Peças
            </p>
            <span className="text-xs text-brand-primary font-medium">
              {totalInventoryUnits} un. em estoque
            </span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-brand-blush text-brand-primary inline-flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
              VISÍVEIS NA VITRINE
            </span>
            <p className="font-editorial text-xl sm:text-2xl font-bold text-text-primary mt-1">
              {counts.active} Peças
            </p>
            <span className="text-xs text-status-success font-medium">Disponíveis no site</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-brand-blush text-brand-primary inline-flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
              OCULTOS DA VITRINE
            </span>
            <p className="font-editorial text-xl sm:text-2xl font-bold text-text-primary mt-1">
              {counts.hidden} Peças
            </p>
            <span className="text-xs text-brand-muted">Preservados no painel</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-brand-soft text-brand-plum inline-flex items-center justify-center shrink-0">
            <EyeOff className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
              EM DESTAQUE
            </span>
            <p className="font-editorial text-xl sm:text-2xl font-bold text-brand-primary mt-1">
              {counts.featured} Peças
            </p>
            <span className="text-xs text-brand-muted">Vitrine principal</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-brand-blush text-brand-primary inline-flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </span>
        </div>
      </section>

      {/* Busca, Filtros e Lista Responsiva */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="w-full md:w-80">
            <Input
              label="Buscar peça no catálogo"
              placeholder="Buscar por nome da lingerie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div
            role="group"
            aria-label="Filtrar produtos por status"
            className="flex flex-wrap items-center gap-1.5"
          >
            {STATUS_TABS.map((tab) => {
              const count = counts[tab.id];
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  aria-pressed={isSelected}
                  className={`min-h-11 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-brand-primary text-white"
                      : "bg-brand-soft text-brand-muted hover:text-brand-plum"
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {isLoading && products.length === 0 ? (
          <p className="text-sm text-brand-muted py-6 text-center">
            Carregando produtos do catálogo...
          </p>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Não encontramos peças para o filtro ou busca informados. Limpe os filtros ou cadastre uma nova peça."
            actionLabel="Limpar Filtros"
            onAction={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          />
        ) : (
          <div className="divide-y divide-brand-border">
            {filteredProducts.map((item) => {
              const totalStock = getTotalStock(item);
              const isBusy = isMutatingId === item.id;

              return (
                <article
                  key={item.id}
                  data-testid={`product-row-${item.id}`}
                  className="py-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center"
                >
                  <div className="md:col-span-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-brand-soft border border-brand-border flex items-center justify-center font-editorial font-bold text-brand-plum shrink-0">
                      MM
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="text-sm font-bold text-brand-plum">{item.name}</h2>
                        {item.featured && <Badge variant="blush">Destaque</Badge>}
                      </div>
                      {item.description && (
                        <p className="text-xs text-brand-muted line-clamp-1">{item.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-xs font-bold text-text-primary">
                      {item.category?.name ?? "Sem categoria"}
                    </p>
                    <p className="text-[11px] text-brand-muted">
                      {item.variants.length} variaç{item.variants.length === 1 ? "ão" : "ões"}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-sm font-bold text-text-primary">
                      {formatPriceBRL(item.price)}
                    </span>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <p className="text-xs font-bold text-text-primary">{totalStock} un. totais</p>
                    <div className="flex flex-wrap gap-1">
                      {item.variants.map((v) => (
                        <span
                          key={v.id}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            v.stock > 0
                              ? "bg-brand-blush/60 text-brand-plum"
                              : "bg-brand-soft text-brand-muted line-through"
                          }`}
                        >
                          {v.size} {v.stock}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-wrap items-center justify-between md:justify-end gap-2 w-full">
                    <Badge variant={item.active ? "available" : "neutral"} dot>
                      {item.active ? "Ativo" : "Oculto"}
                    </Badge>

                    <div className="inline-flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Editar ${item.name}`}
                        onClick={() => navigate(`/painel/produtos/${item.id}/editar`)}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar
                      </Button>

                      <button
                        type="button"
                        disabled={isBusy}
                        aria-label={item.active ? `Ocultar ${item.name}` : `Reativar ${item.name}`}
                        onClick={() => void handleToggleActive(item)}
                        className="min-w-11 min-h-11 px-2.5 rounded-xl border border-brand-border bg-brand-surface text-xs font-semibold text-brand-plum hover:bg-brand-soft disabled:opacity-50 inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        {item.active ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Ocultar</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Reativar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        aria-label={`Excluir ${item.name}`}
                        onClick={() => setDeleteTarget(item)}
                        className="min-w-11 min-h-11 rounded-xl border border-brand-border bg-brand-surface text-status-danger hover:bg-status-danger-bg disabled:opacity-50 inline-flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        subtitle="CONFIRMAÇÃO DE EXCLUSÃO"
        title={deleteTarget ? `Excluir "${deleteTarget.name}"?` : "Excluir produto"}
        description="Esta ação remove o produto permanentemente caso ele não possua pedidos vinculados. Se preferir apenas tirá-lo da vitrine, utilize a opção Ocultar."
        icon={<AlertTriangle className="w-5 h-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void handleConfirmDelete()}>
              Confirmar Exclusão
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <div className="bg-brand-soft border border-brand-border rounded-xl p-3 text-xs text-text-secondary space-y-1">
            <p>
              <strong className="text-brand-plum">Peça:</strong> {deleteTarget.name}
            </p>
            <p>
              <strong className="text-brand-plum">Preço:</strong>{" "}
              {formatPriceBRL(deleteTarget.price)}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
