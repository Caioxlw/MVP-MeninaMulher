import { Ban, Minus, Plus, Ruler, ShoppingBag, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, type ProductStockStatus } from "../../components/ui";
import { ROUTES, type RouteDescriptor } from "../../routes/routes.config";
import {
  fetchStoreProductVariants,
  getFallbackProductVariants,
  getProductColorsAvailability,
  getSizesAvailabilityForColor,
  resolveProductOverallAvailability,
  type StoreProductVariant,
} from "../../services/availability";
import { fetchPublicProductById, type CatalogProductItem } from "../../services/catalogApi";

export interface StoreCatalogPreviewItem {
  id: string;
  category: string;
  name: string;
  subtitle: string;
  price: number;
  installmentText: string;
  imageUrl?: string;
  imageAlt?: string;
  sizes: string[];
  colors: string[];
  colorNames: string[];
  badgeText?: string;
  stockStatus: ProductStockStatus;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function StoreProductDetailScreen({
  descriptor,
  products,
}: {
  descriptor: RouteDescriptor;
  products: StoreCatalogPreviewItem[];
}) {
  const params = useParams();
  const navigate = useNavigate();
  const [apiProductMap, setApiProductMap] = useState<Record<string, CatalogProductItem>>({});
  const [apiVariantsMap, setApiVariantsMap] = useState<Record<string, StoreProductVariant[]>>({});

  const targetId = params.id ?? products[0]?.id ?? "";

  useEffect(() => {
    let active = true;
    if (!targetId) return;

    fetchPublicProductById(targetId)
      .then((loadedProduct) => {
        if (active && loadedProduct) {
          setApiProductMap((prev) => ({ ...prev, [targetId]: loadedProduct }));
          if (loadedProduct.variants.length > 0) {
            setApiVariantsMap((prev) => ({ ...prev, [targetId]: loadedProduct.variants }));
          }
        }
      })
      .catch(() => {
        // Mantém fallback local
      });

    fetchStoreProductVariants(targetId)
      .then((loaded) => {
        if (active && loaded.length > 0) {
          setApiVariantsMap((prev) => ({ ...prev, [targetId]: loaded }));
        }
      })
      .catch(() => {
        // Mantém fallback local
      });

    return () => {
      active = false;
    };
  }, [targetId]);

  const product: StoreCatalogPreviewItem =
    apiProductMap[targetId] ?? products.find((p) => p.id === targetId) ?? products[0];

  const variants = useMemo(
    () => apiVariantsMap[product.id] ?? getFallbackProductVariants(product.id),
    [apiVariantsMap, product.id]
  );

  const colorOptions = useMemo(() => getProductColorsAvailability(variants), [variants]);
  const overallAvailability = useMemo(
    () => resolveProductOverallAvailability(variants),
    [variants]
  );

  const firstAvailableColor =
    colorOptions.find((c) => c.availability.available)?.color ?? colorOptions[0]?.color ?? "Preto";

  const [selectedColor, setSelectedColor] = useState<string>(firstAvailableColor);

  const effectiveColor = colorOptions.some(
    (c) => c.color === selectedColor && c.availability.available
  )
    ? selectedColor
    : firstAvailableColor;

  const sizeOptions = useMemo(
    () => getSizesAvailabilityForColor(variants, effectiveColor),
    [variants, effectiveColor]
  );

  const firstAvailableSize =
    sizeOptions.find((s) => s.availability.available)?.size ?? sizeOptions[0]?.size ?? "P";

  const [selectedSize, setSelectedSize] = useState<string>(firstAvailableSize);
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const effectiveSize = sizeOptions.some((s) => s.size === selectedSize && s.availability.available)
    ? selectedSize
    : firstAvailableSize;

  const activeSizeOption =
    sizeOptions.find((s) => s.size === effectiveSize) ?? sizeOptions[0] ?? null;
  const canAddToBag = Boolean(activeSizeOption && activeSizeOption.availability.available);
  const maxSelectableQty = activeSizeOption ? Math.max(1, activeSizeOption.stock) : 1;
  const effectiveQty = canAddToBag ? Math.min(qty, maxSelectableQty) : 0;

  const handleSelectColor = (color: string, available: boolean) => {
    if (!available) return;
    setAddedFeedback(false);
    setSelectedColor(color);
    setQty(1);
  };

  const handleSelectSize = (size: string, available: boolean) => {
    if (!available) return;
    setAddedFeedback(false);
    setSelectedSize(size);
    setQty(1);
  };

  const handleAddToBag = () => {
    if (!canAddToBag) return;
    setAddedFeedback(true);
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-10">
      {/* Trilha de Navegação + Título da Rota */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-brand-muted flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigate(ROUTES.store.home)}
            className="hover:text-brand-primary cursor-pointer"
          >
            Home
          </button>
          <span>›</span>
          <span>{product.category}</span>
          <span>›</span>
          <span className="font-semibold text-brand-primary">{product.name}</span>
        </div>
        <Badge variant="blush">{descriptor.title}</Badge>
      </div>

      {addedFeedback && canAddToBag && (
        <Alert
          variant="success"
          title="Adicionado à sacola!"
          onClose={() => setAddedFeedback(false)}
        >
          {effectiveQty}x {product.name} ({effectiveColor}, Tam {effectiveSize}) foi salvo na sua
          sacola.{" "}
          <button
            type="button"
            onClick={() => navigate(ROUTES.store.bag)}
            className="font-bold underline text-brand-primary ml-2 cursor-pointer"
          >
            Ir para a Sacola →
          </button>
        </Alert>
      )}

      {/* Grid Principal do Produto: Galeria à Esquerda + Seleção à Direita */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-start">
        {/* Galeria de Fotos */}
        <div className="md:col-span-6 space-y-3">
          <div className="aspect-3/4 rounded-2xl bg-brand-soft border border-brand-border p-6 flex flex-col justify-between relative shadow-xs overflow-hidden">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.imageAlt ?? product.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={overallAvailability.badgeVariant} dot>
                  {overallAvailability.label}
                </Badge>
                {product.badgeText && <Badge variant="brand">{product.badgeText}</Badge>}
              </div>
              <Badge variant="neutral">REF: MM-78401</Badge>
            </div>

            {!product.imageUrl && (
              <div className="relative z-10 my-auto text-center space-y-2 py-12">
                <span className="w-20 h-20 rounded-full bg-brand-blush text-brand-primary font-editorial text-3xl font-bold inline-flex items-center justify-center shadow-xs">
                  MM
                </span>
                <p className="font-editorial text-2xl font-bold text-brand-plum">{product.name}</p>
                <p className="text-xs text-brand-muted">{product.subtitle}</p>
              </div>
            )}

            <div className="relative z-10 bg-brand-surface/90 backdrop-blur-xs rounded-xl p-3 border border-brand-border flex items-center justify-between text-xs text-brand-muted">
              <span>✨ Renda francesa antialérgica com toque macio</span>
              <span className="font-bold text-brand-plum">Cor: {effectiveColor}</span>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Preço, Cores, Tamanhos, Disponibilidade e Ações */}
        <div className="md:col-span-6 bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                {product.category}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary">
                <Star className="w-3.5 h-3.5 fill-brand-primary" /> 4.9 (38 avaliações)
              </span>
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum">
              {product.name}
            </h1>
            <div className="flex items-baseline gap-2.5 pt-1">
              <span className="font-editorial text-2xl sm:text-3xl font-bold text-brand-primary">
                {formatBRL(product.price)}
              </span>
              <span className="text-xs text-brand-muted">{product.installmentText}</span>
            </div>
          </div>

          {/* Seletor de Cor com Etiquetas de Disponibilidade e Bloqueio de Cor Esgotada (RF04, RF05, RNF07) */}
          <div className="bg-brand-soft/60 border border-brand-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-muted">
                Cor selecionada: <strong className="text-text-primary">{effectiveColor}</strong>
              </span>
              <span className="text-brand-muted">{colorOptions.length} opções de cor</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {colorOptions.map((c) => {
                const isSelected = effectiveColor === c.color && c.availability.available;
                const isOut = !c.availability.available;
                return (
                  <button
                    key={c.color}
                    type="button"
                    disabled={isOut}
                    aria-disabled={isOut}
                    aria-pressed={isSelected}
                    aria-label={`Cor ${c.color} - ${c.availability.label}`}
                    onClick={() => handleSelectColor(c.color, c.availability.available)}
                    className={`min-h-11 px-3 py-2 rounded-xl border inline-flex items-center gap-2 transition-all ${
                      isOut
                        ? "bg-brand-soft border-brand-border text-brand-muted opacity-60 cursor-not-allowed line-through"
                        : isSelected
                          ? "bg-brand-surface border-2 border-brand-primary text-brand-plum shadow-xs cursor-pointer"
                          : "bg-brand-surface border-brand-border text-text-primary hover:border-brand-primary cursor-pointer"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-brand-border shrink-0"
                      style={{ backgroundColor: c.colorHex }}
                    />
                    <span className="text-xs font-bold">{c.color}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        c.availability.status === "out_of_stock"
                          ? "bg-status-danger-bg text-status-danger"
                          : c.availability.status === "low_stock"
                            ? "bg-status-warning-bg text-status-warning"
                            : "bg-status-success-bg text-status-success"
                      }`}
                    >
                      {c.availability.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de Tamanho com Etiquetas de Disponibilidade e Bloqueio de Esgotados (RF04, RF05, RNF07) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-muted">
                Tamanho:{" "}
                <strong className="text-text-primary">
                  {activeSizeOption ? activeSizeOption.size : "Indisponível"}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => navigate(ROUTES.store.sizeGuide)}
                className="inline-flex items-center gap-1 font-bold text-brand-primary hover:underline cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5" /> Guia de Medidas
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {sizeOptions.map((item) => {
                const isSelected = effectiveSize === item.size && item.availability.available;
                const isOut = !item.availability.available;

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`size-option-${item.size}`}
                    disabled={isOut}
                    aria-disabled={isOut}
                    aria-pressed={isSelected}
                    aria-label={`Tamanho ${item.size} - ${item.availability.label}${
                      item.availability.available ? ` (${item.stock} un.)` : ""
                    }`}
                    onClick={() => handleSelectSize(item.size, item.availability.available)}
                    className={`min-h-11 touch-target rounded-xl border p-2.5 flex flex-col items-center justify-center gap-1 transition-colors ${
                      isOut
                        ? "bg-brand-soft border-brand-border text-brand-muted opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-brand-plum text-white border-brand-plum shadow-xs cursor-pointer"
                          : "bg-brand-surface text-text-primary border-brand-border hover:border-brand-primary cursor-pointer"
                    }`}
                  >
                    <span className={`text-sm font-bold ${isOut ? "line-through" : ""}`}>
                      {item.size}
                    </span>
                    <Badge variant={item.availability.badgeVariant}>
                      {item.availability.label}
                    </Badge>
                    <span className="text-[10px] opacity-85">
                      {item.availability.available ? `${item.stock} un.` : "0 un."}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Banner de Status da Variação Selecionada */}
            {activeSizeOption && (
              <div
                data-testid="selected-variation-status"
                className="bg-brand-soft/70 border border-brand-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="text-xs text-text-primary">
                  Variação:{" "}
                  <strong>
                    {effectiveColor} · Tamanho {activeSizeOption.size}
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={activeSizeOption.availability.badgeVariant} dot>
                    {activeSizeOption.availability.label}
                  </Badge>
                  {activeSizeOption.availability.available && (
                    <span className="text-xs font-semibold text-brand-muted">
                      ({activeSizeOption.stock} un. para pronta-entrega)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quantidade + Botão Adicionar à Sacola (bloqueado quando esgotado - RF05) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <div className="inline-flex items-center justify-between bg-brand-soft border border-brand-border rounded-xl p-1">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                disabled={!canAddToBag || effectiveQty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="min-w-11 min-h-11 rounded-lg text-brand-plum hover:bg-brand-surface disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span
                data-testid="detail-selected-qty"
                className="min-w-[36px] text-center text-sm font-bold"
              >
                {effectiveQty}
              </span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                disabled={!canAddToBag || effectiveQty >= maxSelectableQty}
                onClick={() => setQty((q) => Math.min(maxSelectableQty, q + 1))}
                className="min-w-11 min-h-11 rounded-lg text-brand-plum hover:bg-brand-surface disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant={canAddToBag ? "primary" : "secondary"}
              fullWidth
              disabled={!canAddToBag}
              leftIcon={
                canAddToBag ? <ShoppingBag className="w-4 h-4" /> : <Ban className="w-4 h-4" />
              }
              onClick={handleAddToBag}
            >
              {canAddToBag ? "Adicionar à sacola" : "Variação Esgotada — Indisponível"}
            </Button>
          </div>

          {/* Detalhes Técnicos & Composição */}
          <div className="pt-4 border-t border-brand-border space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              ✨ Detalhes do Produto & Tecido
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Confeccionado com toque suave e design anatômico que valoriza as formas naturais do
              corpo sem comprimir. Renda francesa antialérgica com acabamento macio e suporte
              delicado.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-brand-soft rounded-xl p-3 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-brand-muted block">
                  COMPOSIÇÃO
                </span>
                <span className="text-xs font-bold text-text-primary">
                  90% Poliamida, 10% Elastano
                </span>
              </div>
              <div className="bg-brand-soft rounded-xl p-3 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-brand-muted block">
                  FECHAMENTO
                </span>
                <span className="text-xs font-bold text-text-primary">
                  Colchete duplo com 3 regulagens
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
