import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  Edit3,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, type FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Badge, Button, EmptyState, Input, Modal } from "../../components/ui";
import { ROUTES, type RouteDescriptor } from "../../routes/routes.config";
import { ProductsApiError } from "../../services/productsApi";
import {
  StockApiError,
  type StockProductGroup,
  type StockVariationItem,
  buildVariantSku,
  clampNonNegativeStock,
  createProductVariant,
  deleteProductVariant,
  exportStockCsv,
  fetchAdminStockGroups,
  normalizeVariantColor,
  normalizeVariantSize,
  resolveColorHex,
  updateProductVariant,
} from "../../services/stockApi";

export type StockFilterStatus = "all" | "regular" | "low_stock" | "out_of_stock";

interface ErrorBannerState {
  title: string;
  message: string;
}

const SIZE_SUGGESTIONS = ["P", "M", "G", "GG", "ÚNICO"];

export function AdminStockScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [stockGroups, setStockGroups] = useState<StockProductGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoData, setIsDemoData] = useState(false);
  const [searchStock, setSearchStock] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockFilterStatus>("all");

  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<ErrorBannerState | null>(null);

  // Estado do Modal de Nova Variação / Entrada de Lote
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProductId, setNewProductId] = useState<string>("");
  const [newSize, setNewSize] = useState("P");
  const [newColor, setNewColor] = useState("");
  const [newStock, setNewStock] = useState("5");
  const [createError, setCreateError] = useState<string | null>(null);

  // Estado do Modal de Edição de Variação
  const [editingTarget, setEditingTarget] = useState<{
    groupId: string;
    productName: string;
    variation: StockVariationItem;
  } | null>(null);
  const [editSize, setEditSize] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editQty, setEditQty] = useState("0");
  const [editError, setEditError] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    navigate(ROUTES.admin.login, {
      replace: true,
      state: { from: location.pathname },
    });
  }, [navigate, location.pathname]);

  const loadStockData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const { groups, isDemo } = await fetchAdminStockGroups();
      setStockGroups(groups);
      setIsDemoData(isDemo);
      setNewProductId((prev) =>
        groups.length > 0 && (!prev || !groups.some((g) => g.id === prev)) ? groups[0].id : prev
      );
    } catch (err) {
      if (err instanceof ProductsApiError && err.code === "UNAUTHORIZED") {
        redirectToLogin();
        return;
      }
      setErrorBanner({
        title: "Erro ao carregar estoque",
        message:
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os dados de estoque da API.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void loadStockData();
  }, [loadStockData]);

  // KPIs calculados dinamicamente a partir das variações ativas
  const metrics = useMemo(() => {
    let totalUnits = 0;
    let totalVariations = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValue = 0;

    for (const group of stockGroups) {
      for (const v of group.variations) {
        totalVariations += 1;
        totalUnits += v.qty;
        totalValue += v.qty * group.unitPriceNumber;
        if (v.qty === 0) {
          outOfStockCount += 1;
        } else if (v.qty <= 2) {
          lowStockCount += 1;
        }
      }
    }

    return {
      totalUnits,
      totalVariations,
      lowStockCount,
      outOfStockCount,
      formattedValue: totalValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    };
  }, [stockGroups]);

  const handleMutationError = (
    err: unknown,
    previousGroups: StockProductGroup[],
    demoSuccessText: string,
    fallbackMessage: string
  ) => {
    if (err instanceof StockApiError && err.code === "UNAUTHORIZED") {
      redirectToLogin();
      return;
    }

    if (isDemoData && err instanceof StockApiError && err.code === "DEMO_READ_ONLY") {
      setLastUpdatedText(demoSuccessText);
      return;
    }

    setStockGroups(previousGroups);
    setLastUpdatedText(null);
    const title =
      err instanceof StockApiError && err.code === "CONFLICT"
        ? "Ação Bloqueada por Integridade de Pedidos"
        : "Erro ao sincronizar estoque";
    setErrorBanner({
      title,
      message: err instanceof Error ? err.message : fallbackMessage,
    });
  };

  const adjustQuantity = async (groupId: string, variantId: string, delta: number) => {
    setErrorBanner(null);
    setLastUpdatedText(null);

    const targetGroup = stockGroups.find((g) => g.id === groupId);
    const targetVariation = targetGroup?.variations.find((v) => v.id === variantId);
    if (!targetGroup || !targetVariation) return;

    const nextQty = clampNonNegativeStock(targetVariation.qty + delta);
    if (nextQty === targetVariation.qty) return;

    const previousGroups = stockGroups;
    const successText = `${targetGroup.name} · ${targetVariation.label}: ${targetVariation.qty} → ${nextQty} un. Salvo e sincronizado na vitrine da loja.`;

    setStockGroups((prev) =>
      prev.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              variations: group.variations.map((v) =>
                v.id === variantId ? { ...v, qty: nextQty } : v
              ),
            }
      )
    );

    try {
      await updateProductVariant(groupId, variantId, { stock: nextQty });
      setLastUpdatedText(successText);
    } catch (err) {
      handleMutationError(
        err,
        previousGroups,
        successText,
        "Erro ao sincronizar quantidade com o servidor."
      );
    }
  };

  const handleOpenCreateModal = (preselectedGroupId?: string) => {
    setCreateError(null);
    if (preselectedGroupId) {
      setNewProductId(preselectedGroupId);
    }
    setNewSize("P");
    setNewColor("");
    setNewStock("5");
    setIsCreateModalOpen(true);
  };

  const handleCreateVariation = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setErrorBanner(null);

    let normalizedSize: string;
    let normalizedColor: string;
    let safeStock: number;
    let targetGroup: StockProductGroup | undefined;

    try {
      normalizedSize = normalizeVariantSize(newSize);
      normalizedColor = normalizeVariantColor(newColor);
      const parsedStock = Number.parseInt(newStock, 10);

      if (Number.isNaN(parsedStock) || parsedStock < 0) {
        setCreateError("O estoque inicial deve ser um número inteiro maior ou igual a zero.");
        return;
      }

      safeStock = clampNonNegativeStock(parsedStock);
      targetGroup = stockGroups.find((g) => g.id === newProductId);
      if (!targetGroup) {
        setCreateError("Selecione um produto válido.");
        return;
      }

      const duplicate = targetGroup.variations.some(
        (v) =>
          v.size.toLowerCase() === normalizedSize.toLowerCase() &&
          v.color.toLowerCase() === normalizedColor.toLowerCase()
      );

      if (duplicate) {
        setCreateError(
          `Já existe uma variação cadastrada com tamanho "${normalizedSize}" e cor "${normalizedColor}" para ${targetGroup.name}.`
        );
        return;
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Dados inválidos para a variação.");
      return;
    }

    const sku = buildVariantSku(targetGroup.code, normalizedColor, normalizedSize);
    const tempId = `var-${targetGroup.id}-${Date.now()}`;
    const newVariation: StockVariationItem = {
      id: tempId,
      sku,
      size: normalizedSize,
      color: normalizedColor,
      label: `${normalizedSize} · ${normalizedColor}`,
      colorHex: resolveColorHex(normalizedColor),
      qty: safeStock,
      hasOrders: false,
    };

    const previousGroups = stockGroups;
    const successText = `Nova variação ${newVariation.label} (${safeStock} un.) adicionada em ${targetGroup.name}.`;

    setStockGroups((prev) =>
      prev.map((group) =>
        group.id === targetGroup.id
          ? { ...group, variations: [...group.variations, newVariation] }
          : group
      )
    );
    setIsCreateModalOpen(false);

    try {
      const createdVariant = await createProductVariant(targetGroup.id, {
        size: normalizedSize,
        color: normalizedColor,
        stock: safeStock,
      });
      if (createdVariant?.id) {
        setStockGroups((current) =>
          current.map((g) =>
            g.id === targetGroup.id
              ? {
                  ...g,
                  variations: g.variations.map((v) =>
                    v.id === tempId ? { ...v, id: createdVariant.id } : v
                  ),
                }
              : g
          )
        );
      }
      setLastUpdatedText(successText);
    } catch (err) {
      handleMutationError(
        err,
        previousGroups,
        successText,
        "Erro ao cadastrar variação no servidor."
      );
    }
  };

  const handleOpenEditModal = (group: StockProductGroup, variation: StockVariationItem) => {
    setEditError(null);
    setEditingTarget({ groupId: group.id, productName: group.name, variation });
    setEditSize(variation.size);
    setEditColor(variation.color);
    setEditQty(String(variation.qty));
  };

  const handleSaveEditVariation = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTarget) return;
    setEditError(null);
    setErrorBanner(null);

    let normalizedSize: string;
    let normalizedColor: string;
    let safeQty: number;
    let targetGroup: StockProductGroup | undefined;

    try {
      normalizedSize = normalizeVariantSize(editSize);
      normalizedColor = normalizeVariantColor(editColor);
      const parsedQty = Number.parseInt(editQty, 10);

      if (Number.isNaN(parsedQty) || parsedQty < 0) {
        setEditError("A quantidade em estoque deve ser um número inteiro maior ou igual a zero.");
        return;
      }

      safeQty = clampNonNegativeStock(parsedQty);
      targetGroup = stockGroups.find((g) => g.id === editingTarget.groupId);
      if (!targetGroup) return;

      const collision = targetGroup.variations.some(
        (v) =>
          v.id !== editingTarget.variation.id &&
          v.size.toLowerCase() === normalizedSize.toLowerCase() &&
          v.color.toLowerCase() === normalizedColor.toLowerCase()
      );

      if (collision) {
        setEditError(
          `Já existe outra variação com tamanho "${normalizedSize}" e cor "${normalizedColor}" neste produto.`
        );
        return;
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao validar edição da variação.");
      return;
    }

    const nextLabel = `${normalizedSize} · ${normalizedColor}`;
    const previousGroups = stockGroups;
    const successText = `Variação ${nextLabel} de ${editingTarget.productName} atualizada para ${safeQty} un.`;
    const currentEditing = editingTarget;

    setStockGroups((prev) =>
      prev.map((group) => {
        if (group.id !== currentEditing.groupId) return group;
        return {
          ...group,
          variations: group.variations.map((v) =>
            v.id === currentEditing.variation.id
              ? {
                  ...v,
                  size: normalizedSize,
                  color: normalizedColor,
                  label: nextLabel,
                  colorHex: resolveColorHex(normalizedColor),
                  qty: safeQty,
                }
              : v
          ),
        };
      })
    );
    setEditingTarget(null);

    try {
      await updateProductVariant(currentEditing.groupId, currentEditing.variation.id, {
        size: normalizedSize,
        color: normalizedColor,
        stock: safeQty,
      });
      setLastUpdatedText(successText);
    } catch (err) {
      handleMutationError(
        err,
        previousGroups,
        successText,
        "Erro ao atualizar variação no servidor."
      );
    }
  };

  const handleDeleteVariation = async (group: StockProductGroup, variation: StockVariationItem) => {
    setErrorBanner(null);
    setLastUpdatedText(null);
    if (variation.hasOrders) {
      setErrorBanner({
        title: "Ação Bloqueada por Integridade de Pedidos",
        message: `Não é possível excluir a variação "${variation.label}" (${group.name}) pois ela possui pedidos vinculados. Recomendamos zerar o estoque (0 un.) para indisponibilizá-la na vitrine.`,
      });
      return;
    }

    const previousGroups = stockGroups;
    const successText = `Variação ${variation.label} removida de ${group.name}.`;

    setStockGroups((prev) =>
      prev.map((g) =>
        g.id === group.id
          ? { ...g, variations: g.variations.filter((v) => v.id !== variation.id) }
          : g
      )
    );

    try {
      await deleteProductVariant(group.id, variation.id);
      setLastUpdatedText(successText);
    } catch (err) {
      handleMutationError(
        err,
        previousGroups,
        successText,
        "Erro ao remover variação no servidor."
      );
    }
  };

  const handleExportCsv = () => {
    const csv = exportStockCsv(stockGroups);
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      try {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "relatorio-estoque-menina-mulher.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        // Ignora em ambientes de teste sem suporte completo a Blob URL
      }
    }
    setLastUpdatedText("Relatório CSV de estoque exportado com sucesso.");
  };

  const normalizedQuery = searchStock.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    return stockGroups
      .map((group) => {
        const groupMatchesQuery =
          !normalizedQuery ||
          group.name.toLowerCase().includes(normalizedQuery) ||
          group.code.toLowerCase().includes(normalizedQuery);

        const matchingVariations = group.variations.filter((v) => {
          const matchesQuery =
            groupMatchesQuery ||
            v.label.toLowerCase().includes(normalizedQuery) ||
            v.sku.toLowerCase().includes(normalizedQuery) ||
            v.size.toLowerCase().includes(normalizedQuery) ||
            v.color.toLowerCase().includes(normalizedQuery);

          if (!matchesQuery) return false;

          if (statusFilter === "regular") return v.qty > 2;
          if (statusFilter === "low_stock") return v.qty > 0 && v.qty <= 2;
          if (statusFilter === "out_of_stock") return v.qty === 0;
          return true;
        });

        return {
          ...group,
          groupMatchesQuery,
          variations: matchingVariations,
        };
      })
      .filter((group) => {
        if (group.variations.length > 0) return true;
        return statusFilter === "all" && group.groupMatchesQuery;
      });
  }, [stockGroups, normalizedQuery, statusFilter]);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {lastUpdatedText && (
        <Alert
          variant="success"
          title="Sincronização Ativa com a Vitrine"
          onClose={() => setLastUpdatedText(null)}
        >
          {lastUpdatedText}
        </Alert>
      )}

      {errorBanner && (
        <Alert variant="error" title={errorBanner.title} onClose={() => setErrorBanner(null)}>
          {errorBanner.message}
        </Alert>
      )}

      {isDemoData && (
        <Alert variant="warning" title="Modo Demonstração">
          A API do backend está indisponível ou em modo offline local. Exibindo dados de
          demonstração.
        </Alert>
      )}

      <section className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary block">
            LOGÍSTICA & DISPONIBILIDADE • {location.pathname}
          </span>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum">
            {descriptor.title}
          </h1>
          <p className="text-sm text-text-secondary">{descriptor.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadStockData()}
            disabled={isLoading}
            aria-label="Atualizar estoque"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Atualizar
          </Button>
          <Badge variant="available" dot>
            Sincronização Ativa
          </Badge>
          <span className="text-xs text-brand-muted">
            {metrics.totalUnits} peças totais auditadas
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-brand-muted">Total de Peças Físicas</span>
            <Archive className="w-4 h-4 text-brand-primary" />
          </div>
          <p className="font-editorial text-2xl font-bold text-text-primary">
            {metrics.totalUnits} peças
          </p>
          <p className="text-[11px] text-brand-muted mt-1">
            {metrics.totalVariations} variações ativas cadastradas
          </p>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-brand-muted">Alerta: Baixo Estoque</span>
            <AlertTriangle className="w-4 h-4 text-status-warning" />
          </div>
          <p className="font-editorial text-2xl font-bold text-brand-primary">
            {metrics.lowStockCount} variações
          </p>
          <p className="text-[11px] text-brand-muted mt-1">Até 2 unidades restantes</p>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-brand-muted">Esgotadas na Vitrine</span>
            <Package className="w-4 h-4 text-status-danger" />
          </div>
          <p className="font-editorial text-2xl font-bold text-status-danger">
            {metrics.outOfStockCount} variações
          </p>
          <p className="text-[11px] text-status-danger mt-1">Indisponíveis para compra</p>
        </div>

        <div className="bg-brand-primary text-white rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/90">
              Valor do Estoque (Preço Venda)
            </span>
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <p className="font-editorial text-2xl font-bold">{metrics.formattedValue}</p>
          <p className="text-[11px] text-white/85 mt-1">Margem média estimada de 58%</p>
        </div>
      </section>

      <section className="bg-brand-surface border border-brand-border rounded-2xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="w-full md:w-80">
            <Input
              label="Buscar por peça, cor, SKU ou tamanho"
              placeholder="Ex.: Sutiã Renda Noir, SN-PR-P..."
              value={searchStock}
              onChange={(e) => setSearchStock(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4" />
              Relatório CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => handleOpenCreateModal()}>
              <Plus className="w-4 h-4" />
              Entrada de Lote / Reposição
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-brand-border">
          {(
            [
              { id: "all", label: `Todas (${metrics.totalVariations})` },
              {
                id: "regular",
                label: `Estoque Regular (${
                  metrics.totalVariations - metrics.lowStockCount - metrics.outOfStockCount
                })`,
              },
              { id: "low_stock", label: `Baixo Estoque (${metrics.lowStockCount})` },
              { id: "out_of_stock", label: `Esgotadas (${metrics.outOfStockCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-11 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-brand-primary text-white"
                  : "bg-brand-soft text-brand-muted hover:text-brand-plum"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading && stockGroups.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center text-sm text-brand-muted flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
          Carregando produtos e estoque...
        </div>
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          title="Nenhuma variação encontrada"
          description="Não encontramos variações para o filtro ou termo pesquisado. Limpe os filtros ou cadastre uma nova variação."
          actionLabel="Limpar Filtros"
          onAction={() => {
            setSearchStock("");
            setStatusFilter("all");
          }}
        />
      ) : (
        <div className="space-y-5">
          {filteredGroups.map((group) => {
            const totalUnits = group.variations.reduce((acc, item) => acc + item.qty, 0);
            return (
              <section
                key={group.id}
                className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-brand-border">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                      {group.category} • Código: {group.code}
                    </span>
                    <h2 className="font-editorial text-xl font-bold text-brand-plum">
                      {group.name}
                    </h2>
                    <p className="text-xs text-brand-muted">
                      Preço unitário: <strong>{group.unitPrice}</strong> • Margem:{" "}
                      <strong className="text-brand-primary">{group.margin}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenCreateModal(group.id)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nova Variação
                    </Button>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                        TOTAL NO PRODUTO
                      </span>
                      <span
                        className={`font-editorial text-xl font-bold ${
                          totalUnits > 0 ? "text-brand-plum" : "text-status-danger"
                        }`}
                      >
                        {totalUnits} un.
                      </span>
                    </div>
                  </div>
                </div>

                {group.variations.length === 0 ? (
                  <p className="text-xs text-brand-muted py-2">
                    Nenhuma variação cadastrada ainda para este produto. Clique em &ldquo;Nova
                    Variação&rdquo; para adicionar tamanhos, cores e estoque.
                  </p>
                ) : (
                  <div className="divide-y divide-brand-border">
                    {group.variations.map((v) => {
                      const statusVariant =
                        v.qty === 0 ? "outOfStock" : v.qty <= 2 ? "lowStock" : "available";
                      const statusLabel =
                        v.qty === 0
                          ? "Indisponível no site"
                          : v.qty <= 2
                            ? "Últimas unidades"
                            : "Estoque regular";

                      return (
                        <div
                          key={v.id}
                          className={`py-3.5 px-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            v.alertText
                              ? "bg-brand-soft/80 border border-brand-primary/20 my-1"
                              : ""
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-brand-border shrink-0"
                                style={{ backgroundColor: v.colorHex }}
                              />
                              <span
                                className={`text-sm font-bold ${
                                  v.qty === 0
                                    ? "line-through text-brand-muted"
                                    : "text-text-primary"
                                }`}
                              >
                                {v.label}
                              </span>
                              <span className="text-xs text-brand-muted">Ref: {v.sku}</span>
                            </div>
                            {v.alertText && (
                              <p className="text-xs font-semibold text-status-danger bg-brand-surface px-2.5 py-1 rounded-lg border border-status-danger/20 inline-block">
                                ! {v.alertText}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
                            <Badge variant={statusVariant} dot>
                              {statusLabel}
                            </Badge>

                            <div className="inline-flex items-center gap-1.5 bg-brand-soft border border-brand-border rounded-xl p-1">
                              <button
                                type="button"
                                aria-label={`Diminuir estoque de ${v.label}`}
                                disabled={v.qty === 0}
                                onClick={() => void adjustQuantity(group.id, v.id, -1)}
                                className="min-w-11 min-h-11 rounded-lg bg-brand-surface text-brand-plum hover:bg-brand-blush disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span
                                data-testid={`qty-${v.sku}`}
                                className="min-w-[36px] text-center text-sm font-bold text-text-primary"
                              >
                                {v.qty}
                              </span>
                              <button
                                type="button"
                                aria-label={`Aumentar estoque de ${v.label}`}
                                onClick={() => void adjustQuantity(group.id, v.id, 1)}
                                className="min-w-11 min-h-11 rounded-lg bg-brand-surface text-brand-plum hover:bg-brand-blush inline-flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                aria-label={`Editar variação ${v.label}`}
                                onClick={() => handleOpenEditModal(group, v)}
                                className="min-w-11 min-h-11 rounded-xl border border-brand-border bg-brand-surface text-brand-plum hover:bg-brand-soft inline-flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Remover variação ${v.label}`}
                                onClick={() => void handleDeleteVariation(group, v)}
                                className="min-w-11 min-h-11 rounded-xl border border-brand-border bg-brand-surface text-status-danger hover:bg-status-danger-bg inline-flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Modal: Nova Variação / Entrada de Lote */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        subtitle="GESTÃO DE GRADE & ESTOQUE"
        title="Nova Variação / Entrada de Lote"
        description="Cadastre uma nova combinação de tamanho e cor e informe a quantidade inicial em estoque."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="create-variation-form">
              Salvar Variação
            </Button>
          </>
        }
      >
        <form id="create-variation-form" onSubmit={handleCreateVariation} className="space-y-4">
          {createError && (
            <Alert variant="error" title="Não foi possível cadastrar">
              {createError}
            </Alert>
          )}

          <div>
            <label
              htmlFor="select-product-stock"
              className="block text-xs font-bold uppercase tracking-wider text-brand-plum mb-1.5"
            >
              Peça do Catálogo
            </label>
            <select
              id="select-product-stock"
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              {stockGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Tamanho (P, M, G, GG, ÚNICO)"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="Ex.: GG"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {SIZE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewSize(s)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                      newSize.trim().toUpperCase() === s
                        ? "bg-brand-primary text-white"
                        : "bg-brand-soft text-brand-plum"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Cor da Peça"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              placeholder="Ex.: Vinho, Rosa Pétala"
            />
          </div>

          <Input
            label="Quantidade Inicial em Estoque"
            type="number"
            min={0}
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
          />
        </form>
      </Modal>

      {/* Modal: Editar Variação */}
      <Modal
        isOpen={Boolean(editingTarget)}
        onClose={() => setEditingTarget(null)}
        subtitle={editingTarget?.productName ?? "AJUSTE DE VARIAÇÃO"}
        title="Editar Variação e Saldo"
        description="Corrija o tamanho, a cor ou defina diretamente a quantidade física auditada na loja."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingTarget(null)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="edit-variation-form">
              Salvar Alterações
            </Button>
          </>
        }
      >
        <form id="edit-variation-form" onSubmit={handleSaveEditVariation} className="space-y-4">
          {editError && (
            <Alert variant="error" title="Conflito ou dado inválido">
              {editError}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Tamanho" value={editSize} onChange={(e) => setEditSize(e.target.value)} />
            <Input label="Cor" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
          </div>

          <Input
            label="Saldo em Estoque (unidades)"
            type="number"
            min={0}
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}
