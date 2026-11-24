import {
  Gift,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { StoreLayout } from "../components/layout/StoreLayout";
import { StoreProvider, useCart, useFavorites } from "../contexts/StoreContext";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  ProductCard,
  type ProductStockStatus,
} from "../components/ui";
import { AdminLoginScreen, ProtectedAdminRoute } from "../pages/admin/AdminLoginScreen";
import { AdminOrdersScreen } from "../pages/admin/AdminOrdersScreen";
import { AdminProductFormScreen } from "../pages/admin/AdminProductFormScreen";
import { AdminProductsScreen } from "../pages/admin/AdminProductsScreen";
import { AdminStockScreen } from "../pages/admin/AdminStockScreen";
import { StoreBagScreen } from "../pages/store/StoreBagScreen";
import { StoreProductDetailScreen } from "../pages/store/StoreProductDetailScreen";
import {
  DEFAULT_CATALOG_CATEGORY_NAMES,
  fetchPublicProducts,
  mapCatalogProductToFavorite,
  matchesCatalogCategoryFilter,
  resolveCategoryLabelFromSlug,
  type CatalogProductItem,
} from "../services/catalogApi";
import {
  ADMIN_ROUTE_DESCRIPTORS,
  ROUTES,
  STORE_ROUTE_DESCRIPTORS,
  type RouteDescriptor,
} from "./routes.config";

interface HealthResponse {
  status: "healthy" | "degraded";
  services?: {
    api?: { status: string; port: number };
    database?: {
      status: "connected" | "disconnected";
      provider: string;
      latencyMs: number | null;
    };
  };
}

const PREVIEW_PRODUCTS: Array<{
  id: string;
  category: string;
  name: string;
  subtitle: string;
  price: number;
  installmentText: string;
  sizes: string[];
  colors: string[];
  colorNames: string[];
  badgeText?: string;
  stockStatus: ProductStockStatus;
}> = [
  {
    id: "sutia-renda-noir",
    category: "Partes de Cima",
    name: "Sutiã Renda Noir",
    subtitle: "Aro duplo em tule bordado e toque suave",
    price: 119.9,
    installmentText: "3x de R$ 39,96 s/ juros",
    sizes: ["P", "M", "G"],
    colors: ["#23101B", "#6F4F64", "#F5CCD0"],
    colorNames: ["Preto", "Cinza", "Rosa"],
    badgeText: "Destaque",
    stockStatus: "available",
  },
  {
    id: "calcinha-algodao-doce",
    category: "Partes de Baixo",
    name: "Calcinha Algodão Doce",
    subtitle: "Respirável e ideal para o dia a dia",
    price: 39.9,
    installmentText: "À vista",
    sizes: ["M", "G"],
    colors: ["#F5CCD0", "#FFFFFF"],
    colorNames: ["Rosa", "Branco"],
    badgeText: "100% Algodão",
    stockStatus: "low_stock",
  },
  {
    id: "conjunto-microfibra-nude",
    category: "Conjuntos",
    name: "Conjunto Microfibra Nude",
    subtitle: "Tecido toque de seda segunda pele",
    price: 149.9,
    installmentText: "4x de R$ 37,47 s/ juros",
    sizes: ["P", "M"],
    colors: ["#E5C3B5", "#520139"],
    colorNames: ["Nude", "Vinho"],
    stockStatus: "low_stock",
  },
  {
    id: "body-renda-floral",
    category: "Partes de Cima",
    name: "Body Renda Manga Longa",
    subtitle: "Transparência poá sutil e costas cavadas",
    price: 99.9,
    installmentText: "Consulte reposição",
    sizes: ["P", "M"],
    colors: ["#23101B"],
    colorNames: ["Preto"],
    stockStatus: "out_of_stock",
  },
  {
    id: "camisola-cetim-renda",
    category: "Conjuntos",
    name: "Camisola Cetim & Renda",
    subtitle: "Fluidez e noites tranquilas",
    price: 139.9,
    installmentText: "3x s/ juros",
    sizes: ["P", "M", "G"],
    colors: ["#520139", "#F5CCD0"],
    colorNames: ["Vinho", "Rosa"],
    badgeText: "Novo",
    stockStatus: "available",
  },
  {
    id: "calcinha-renda-floral",
    category: "Partes de Baixo",
    name: "Calcinha Renda Floral",
    subtitle: "Cós elástico macio sem marcar",
    price: 45.9,
    installmentText: "À vista",
    sizes: ["P", "M", "G", "GG"],
    colors: ["#F5CCD0", "#23101B"],
    colorNames: ["Rosa", "Preto"],
    stockStatus: "available",
  },
  {
    id: "sutia-triangulo-conforto",
    category: "Partes de Cima",
    name: "Sutiã Triângulo Soft",
    subtitle: "Renda floral pura sem bojo",
    price: 109.9,
    installmentText: "3x de R$ 36,63 s/ juros",
    sizes: ["P", "M", "G"],
    colors: ["#23101B", "#F5CCD0"],
    colorNames: ["Preto", "Rosa"],
    badgeText: "Romântico",
    stockStatus: "available",
  },
  {
    id: "robe-chiffon-renda",
    category: "Conjuntos",
    name: "Robe Chiffon & Renda",
    subtitle: "Acabamento artesanal em renda",
    price: 159.9,
    installmentText: "3x s/ juros",
    sizes: ["P", "M", "G", "GG"],
    colors: ["#FFFFFF", "#D1025A"],
    colorNames: ["Branco", "Rosa"],
    badgeText: "Edição Limitada",
    stockStatus: "available",
  },
];

/* ============================================================================
 * TELAS DA LOJA (CLIENTE)
 * ============================================================================ */

/**
 * C01 / Desktop Home — Página Inicial da Loja (/)
 */
function StoreHomeScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [filterText, setFilterText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");

  useEffect(() => {
    let active = true;
    fetchPublicProducts()
      .then((items) => {
        if (!active) return;
        setCatalogProducts(items);
        setCatalogError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setCatalogProducts([]);
        setCatalogError(
          err instanceof Error ? err.message : "Não foi possível carregar os produtos do catálogo."
        );
      })
      .finally(() => {
        if (active) setIsLoadingCatalog(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const loadCatalog = () => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthResponse) => {
        if (active) setHealth(data);
      })
      .catch(() => {
        if (active) setHealth({ status: "degraded" });
      });
    return () => {
      active = false;
    };
  }, []);

  const isConnected = health?.services?.database?.status === "connected";

  const categoryTabs =
    catalogProducts.length > 0
      ? ["Todos", ...Array.from(new Set(catalogProducts.map((p) => p.category)))]
      : ["Todos", "Conjuntos", "Sutiãs", "Calcinhas", "Pijamas & Baby Doll"];

  const filteredProducts = catalogProducts.filter((p) => {
    const query = filterText.trim().toLowerCase();
    const matchesSearch =
      !query || p.name.toLowerCase().includes(query) || p.subtitle.toLowerCase().includes(query);
    const matchesCategory =
      selectedCategory === "Todos" || matchesCatalogCategoryFilter(p, selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">
      {/* Hero Editorial Responsivo: 1 coluna no Mobile, 2 colunas (7 + 5) no Desktop */}
      <section className="bg-brand-soft/70 border border-brand-border rounded-2xl p-5 sm:p-8 md:p-10 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
          <div className="md:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="blush">NOVA COLEÇÃO • ALTA SENSUALIDADE</Badge>
              <Badge variant="available" dot>
                {isConnected ? "Conectado" : "Verificando API"}
              </Badge>
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-bold text-brand-plum leading-tight">
              {descriptor.title}
            </h1>
            <p className="text-sm sm:text-base text-text-secondary max-w-2xl">
              {descriptor.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button variant="primary" onClick={() => navigate(ROUTES.store.catalog)}>
                Ver Catálogo Completo
              </Button>
              <Button variant="secondary" onClick={() => navigate(ROUTES.store.sizeGuide)}>
                <Ruler className="w-4 h-4" />
                Guia de Medidas
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-brand-surface border border-brand-border rounded-xl p-3 flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-brand-primary shrink-0" />
                <div>
                  <p className="text-xs font-bold text-brand-plum">Frete Facilitado</p>
                  <p className="text-[11px] text-brand-muted">Envio rápido e discreto</p>
                </div>
              </div>
              <div className="bg-brand-surface border border-brand-border rounded-xl p-3 flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-brand-primary shrink-0" />
                <div>
                  <p className="text-xs font-bold text-brand-plum">Atendimento 1 a 1</p>
                  <p className="text-[11px] text-brand-muted">Consultoria por WhatsApp</p>
                </div>
              </div>
              <div className="bg-brand-surface border border-brand-border rounded-xl p-3 flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-brand-primary shrink-0" />
                <div>
                  <p className="text-xs font-bold text-brand-plum">Sem Cadastro</p>
                  <p className="text-[11px] text-brand-muted">Rápido e sem senhas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 md:p-7 flex flex-col justify-between min-h-[240px] md:min-h-[300px] shadow-xs relative overflow-hidden">
              <div className="space-y-3">
                <Badge variant="blush">SENSUALIDADE & CUIDADO</Badge>
                <h2 className="font-editorial text-xl md:text-2xl font-bold text-brand-plum leading-snug">
                  Realce sua <span className="italic text-brand-primary">beleza</span> com
                  delicadeza e conforto.
                </h2>
                <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                  Peças exclusivas em renda nobre, microfibra e algodão pensadas no seu bem-estar
                  diário. Monte sua sacola e finalize pelo WhatsApp sem burocracia.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-brand-border flex items-center justify-between gap-2 text-xs bg-brand-soft/60 -mx-6 -mb-6 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-primary" />
                  <div>
                    <span className="font-bold text-brand-plum block">Rendas Nobres</span>
                    <span className="text-[11px] text-brand-muted">Toque macio que não marca</span>
                  </div>
                </div>
                <Badge variant="blush">100% Brasil</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grade Responsiva do Catálogo */}
      <section aria-label="Prévia da grade responsiva da loja" className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary block">
              CATÁLOGO SELECIONADO
            </span>
            <h2 className="font-editorial text-xl sm:text-2xl md:text-3xl font-bold text-brand-plum">
              Explore Nossas Peças
            </h2>
            <p className="text-xs text-brand-muted">Conforto absoluto do amanhecer ao anoitecer</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-brand-soft p-1.5 rounded-xl border border-brand-border">
              {categoryTabs.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-brand-primary text-white shadow-xs"
                      : "text-brand-muted hover:text-brand-plum"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-64">
              <Input
                label="Filtrar vitrine"
                placeholder="Ex.: Sutiã, Calcinha..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>

        {catalogError ? (
          <div className="space-y-4">
            <Alert variant="error" title="Catálogo indisponível no momento">
              {catalogError} Verifique se o servidor da API está em execução.
            </Alert>
            <EmptyState
              title="Não foi possível carregar as peças"
              description="Ocorreu uma falha de comunicação ao buscar os produtos ativos no servidor."
              actionLabel="Tentar novamente"
              onAction={loadCatalog}
            />
          </div>
        ) : isLoadingCatalog ? (
          <div
            data-testid="home-catalog-loading"
            className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center text-sm text-brand-muted"
          >
            Carregando catálogo de produtos ativos...
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                category={product.category}
                subtitle={product.subtitle}
                price={product.price}
                installmentText={product.installmentText}
                imageUrl={product.imageUrl}
                imageAlt={product.imageAlt}
                sizes={product.sizes}
                colors={product.colors}
                badgeText={product.badgeText}
                stockStatus={product.stockStatus}
                isFavorite={isFavorite(product.id)}
                onToggleFavorite={() => toggleFavorite(mapCatalogProductToFavorite(product))}
                onAction={(id) => navigate(`/produto/${id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma peça encontrada"
            description="Não encontramos peças ativas para o filtro selecionado. Limpe a busca para ver toda a coleção."
            actionLabel="Limpar filtro"
            onAction={() => {
              setFilterText("");
              setSelectedCategory("Todos");
            }}
          />
        )}
      </section>

      {/* Seção Editorial "Nossa Essência" */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-6 md:p-10 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center">
          <div className="md:col-span-5 bg-brand-soft border border-brand-border rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[220px]">
            <span className="w-16 h-16 rounded-full bg-brand-blush text-brand-primary font-editorial text-2xl font-bold inline-flex items-center justify-center mb-3">
              MM
            </span>
            <p className="font-editorial text-2xl font-bold text-brand-plum">Menina Mulher</p>
            <p className="text-xs uppercase tracking-widest text-brand-muted mt-1">
              BOUTIQUE INTIMISTA • DESDE 2021
            </p>
          </div>

          <div className="md:col-span-7 space-y-4">
            <Badge variant="blush">♥ Nossa Essência</Badge>
            <h2 className="font-editorial text-2xl md:text-3xl font-bold text-brand-plum leading-snug">
              Feito com carinho para celebrar a mulher em todas as suas fases
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              A <strong>Menina Mulher Lingerie</strong> nasceu do desejo de transformar o vestir
              íntimo em um ritual de autoestima, afeto e liberdade. Acreditamos que a lingerie certa
              não aperta, não incomoda: ela abraça suas curvas com a sutileza da renda e a suavidade
              da microfibra premium.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-brand-soft rounded-xl p-3 border border-brand-border">
                <p className="font-editorial text-lg font-bold text-brand-primary">+5.000</p>
                <p className="text-[11px] text-brand-muted">Mulheres transformadas</p>
              </div>
              <div className="bg-brand-soft rounded-xl p-3 border border-brand-border">
                <p className="font-editorial text-lg font-bold text-brand-primary">100%</p>
                <p className="text-[11px] text-brand-muted">Ajuste confortável</p>
              </div>
              <div className="bg-brand-soft rounded-xl p-3 border border-brand-border">
                <p className="font-editorial text-lg font-bold text-brand-primary">4.9 / 5</p>
                <p className="text-[11px] text-brand-muted">Avaliação das clientes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção "Visita & Contato" */}
      <section className="space-y-4">
        <div className="text-center max-w-xl mx-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary block">
            VISITA & CONTATO
          </span>
          <h2 className="font-editorial text-2xl md:text-3xl font-bold text-brand-plum">
            Atendimento Próximo e Acolhedor
          </h2>
          <p className="text-xs sm:text-sm text-brand-muted">
            Tire todas as suas dúvidas diretamente com nossa fundadora pelo WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="font-editorial text-lg font-bold text-brand-plum">
              Canais Diretos de Atendimento
            </h3>
            <div className="bg-brand-soft border border-brand-border rounded-xl p-3.5 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-primary text-white inline-flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                  WHATSAPP OFICIAL
                </p>
                <p className="text-sm font-bold text-brand-plum">(11) 98765-4321</p>
                <p className="text-[11px] text-brand-muted">
                  Clique para iniciar conversa imediata
                </p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-brand-muted">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-primary block">Showroom & Retiradas</strong>
                  Seg a Sex: 09h às 19h • Sáb: 10h às 16h
                </span>
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-primary block">Compra Segura e Humanizada</strong>
                  Seu pedido é separado e embalado diretamente com a proprietária.
                </span>
              </p>
            </div>
          </div>

          <div className="md:col-span-7 bg-brand-soft border border-brand-border rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[240px]">
            <span className="w-12 h-12 rounded-full bg-brand-primary text-white inline-flex items-center justify-center mb-3 shadow-xs">
              <Heart className="w-6 h-6" />
            </span>
            <p className="font-editorial text-xl font-bold text-brand-plum mb-1">
              Menina Mulher Lingerie Boutique
            </p>
            <p className="text-xs text-brand-muted max-w-md mb-4">
              Atendimento consultivo pelo WhatsApp para ajudar você a escolher o caimento ideal em
              cada modelagem de renda, microfibra e algodão.
            </p>
            <Button
              variant="primary"
              onClick={() => window.open("https://wa.me/5511987654321", "_blank")}
            >
              <MessageCircle className="w-4 h-4" />
              Falar com a Dona da Loja
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * C04 — Tela de Catálogo e Coleções por Categoria (/catalogo e /categoria/:slug)
 */
function StoreCatalogScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const params = useParams();
  const navigate = useNavigate();
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [manualCategory, setManualCategory] = useState<{
    routeSlug: string | undefined;
    category: string;
  } | null>(null);
  const [selectedColor, setSelectedColor] = useState("Todas");
  const [selectedSize, setSelectedSize] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    let active = true;
    fetchPublicProducts()
      .then((items) => {
        if (!active) return;
        setCatalogProducts(items);
        setCatalogError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setCatalogProducts([]);
        setCatalogError(
          err instanceof Error ? err.message : "Não foi possível carregar os produtos do catálogo."
        );
      })
      .finally(() => {
        if (active) setIsLoadingCatalog(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const loadCatalog = () => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    setReloadKey((k) => k + 1);
  };

  const routeCategoryLabel = resolveCategoryLabelFromSlug(params.slug);
  const selectedCategory =
    manualCategory && manualCategory.routeSlug === params.slug
      ? manualCategory.category
      : (routeCategoryLabel ?? "Todas");

  const categoryFilterName = selectedCategory === "Todas" ? null : selectedCategory;

  const availableCategories = Array.from(
    new Set([
      "Todas",
      ...(routeCategoryLabel ? [routeCategoryLabel] : []),
      ...DEFAULT_CATALOG_CATEGORY_NAMES,
      ...catalogProducts.map((p) => p.category),
    ])
  );

  const availableColors =
    catalogProducts.length > 0
      ? ["Todas", ...Array.from(new Set(catalogProducts.flatMap((p) => p.colorNames)))]
      : ["Todas", "Vermelho Rubi", "Preto", "Branco", "Nude", "Rosa Chá"];

  const availableSizes =
    catalogProducts.length > 0
      ? ["Todos", ...Array.from(new Set(catalogProducts.flatMap((p) => p.sizes)))]
      : ["Todos", "P", "M", "G", "GG"];

  const filteredProducts = catalogProducts.filter((p) => {
    const matchesCategory = matchesCatalogCategoryFilter(p, selectedCategory);
    const matchesColor = selectedColor === "Todas" || p.colorNames.includes(selectedColor);
    const matchesSize = selectedSize === "Todos" || p.sizes.includes(selectedSize);
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query || p.name.toLowerCase().includes(query) || p.subtitle.toLowerCase().includes(query);
    return matchesCategory && matchesColor && matchesSize && matchesQuery;
  });

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      {/* Cabeçalho da Categoria / Catálogo */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-brand-muted mb-2">
              <span>Início</span>
              <span>›</span>
              <span className="font-bold text-brand-primary">
                {categoryFilterName ?? "Catálogo Completo"}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-bold text-brand-plum">
                {descriptor.title}
              </h1>
              <Badge variant="blush">{filteredProducts.length} peças</Badge>
            </div>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              {categoryFilterName
                ? `Coleção ${categoryFilterName}: modelagens envolventes feitas em renda macia, toque sedoso e caimento impecável.`
                : descriptor.subtitle}
            </p>
          </div>

          <div className="w-full md:w-72">
            <Input
              label="Buscar peça na coleção"
              placeholder="Buscar sutiã, calcinha, renda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Pílulas de Categoria (PBI #38 / Task #233 — RF03, US02) */}
        <div
          data-testid="catalog-category-pills"
          aria-label="Filtrar catálogo por categoria"
          className="pt-4 border-t border-brand-border flex flex-wrap items-center gap-2"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-brand-muted mr-1">
            CATEGORIA:
          </span>
          {availableCategories.map((categoryName) => {
            const isActive = selectedCategory.toLowerCase() === categoryName.toLowerCase();
            return (
              <button
                key={categoryName}
                type="button"
                aria-pressed={isActive}
                onClick={() =>
                  setManualCategory({
                    routeSlug: params.slug,
                    category: categoryName,
                  })
                }
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? "bg-brand-primary text-white shadow-xs"
                    : "bg-brand-soft text-text-primary hover:bg-brand-blush/50"
                }`}
              >
                {categoryName}
              </button>
            );
          })}
        </div>

        {/* Filtros de Cor e Tamanho (conforme protótipo C04 Categoria) */}
        <div className="pt-4 border-t border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted mr-1">
              COR:
            </span>
            {availableColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  selectedColor === color
                    ? "bg-brand-primary text-white shadow-xs"
                    : "bg-brand-soft text-text-primary hover:bg-brand-blush/50"
                }`}
              >
                {color}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted mr-1">
              TAM:
            </span>
            {availableSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  selectedSize === size
                    ? "bg-brand-plum text-white shadow-xs"
                    : "bg-brand-soft text-text-primary hover:bg-brand-blush/50"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grade de Peças Filtradas */}
      {catalogError ? (
        <div className="space-y-4">
          <Alert variant="error" title="Catálogo indisponível no momento">
            {catalogError} Verifique se o servidor da API está em execução.
          </Alert>
          <EmptyState
            title="Não foi possível carregar o catálogo"
            description="Ocorreu uma falha de comunicação ao buscar os produtos ativos no servidor."
            actionLabel="Tentar novamente"
            onAction={loadCatalog}
          />
        </div>
      ) : isLoadingCatalog ? (
        <div
          data-testid="catalog-loading"
          className="bg-brand-surface border border-brand-border rounded-2xl p-8 text-center text-sm text-brand-muted"
        >
          Carregando produtos ativos do catálogo...
        </div>
      ) : filteredProducts.length > 0 ? (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              category={product.category}
              subtitle={product.subtitle}
              price={product.price}
              installmentText={product.installmentText}
              imageUrl={product.imageUrl}
              imageAlt={product.imageAlt}
              sizes={product.sizes}
              colors={product.colors}
              badgeText={product.badgeText}
              stockStatus={product.stockStatus}
              isFavorite={isFavorite(product.id)}
              onToggleFavorite={() => toggleFavorite(mapCatalogProductToFavorite(product))}
              onAction={(id) => navigate(`/produto/${id}`)}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title="Nenhuma peça encontrada com esses filtros"
          description="Tente selecionar outra categoria, cor ou tamanho para ver mais opções da coleção."
          actionLabel="Limpar Filtros"
          onAction={() => {
            setManualCategory({
              routeSlug: params.slug,
              category: "Todas",
            });
            setSelectedColor("Todas");
            setSelectedSize("Todos");
            setSearchQuery("");
          }}
        />
      )}

      {/* Banner de Apoio: Guia de Medidas (conforme C04 Categoria) */}
      <section className="bg-brand-soft border border-brand-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="w-11 h-11 rounded-full bg-brand-surface text-brand-primary border border-brand-border inline-flex items-center justify-center shrink-0">
            <Ruler className="w-5 h-5" />
          </span>
          <div>
            <h2 className="font-editorial text-lg sm:text-xl font-bold text-brand-plum">
              Dúvidas sobre o tamanho ideal?
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted">
              Consulte nosso Guia de Medidas com fita métrica ou fale com nossa consultora íntima
              pelo suporte.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.store.sizeGuide)}>
            Tabela Completa
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.open("https://wa.me/5511987654321", "_blank")}
          >
            <MessageCircle className="w-4 h-4" />
            Chamar no WhatsApp
          </Button>
        </div>
      </section>
    </div>
  );
}

/**
 * C11 — Tela de Favoritos (/favoritos)
 */
function StoreFavoritesScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const navigate = useNavigate();
  const { favorites, favoritesCount, removeFromFavorites, clearFavorites, moveAllFavoritesToCart } =
    useFavorites();
  const { addToCart } = useCart();
  const [catalogById, setCatalogById] = useState<Record<string, CatalogProductItem>>({});
  const [transferNotice, setTransferNotice] = useState<{
    variant: "warning" | "success" | "info";
    title: string;
    message: string;
    showBagAction?: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetchPublicProducts()
      .then((items) => {
        if (!active) return;
        const indexed: Record<string, CatalogProductItem> = {};
        for (const item of items) {
          indexed[item.id] = item;
        }
        setCatalogById(indexed);
      })
      .catch(() => {
        // Mantém exibição com os dados persistidos em localStorage
      });
    return () => {
      active = false;
    };
  }, []);

  const handleClearFavorites = () => {
    setTransferNotice(null);
    clearFavorites();
  };

  const handleAddAllToBag = () => {
    if (favorites.length === 0) return;

    const result = moveAllFavoritesToCart();

    if (result.pendingFavorites.length === 0 && result.transferredCount > 0) {
      setTransferNotice(null);
      navigate(ROUTES.store.bag);
      return;
    }

    if (result.transferredCount > 0 && result.pendingFavorites.length > 0) {
      setTransferNotice({
        variant: "warning",
        title: `${result.transferredCount} peça(s) adicionada(s) à sacola`,
        message: `${result.pendingFavorites.length} peça(s) ainda precisa(m) da escolha de tamanho e cor (ou está(ão) sem estoque) antes de ir para a sacola.`,
        showBagAction: true,
      });
      return;
    }

    setTransferNotice({
      variant: "warning",
      title: "Escolha o tamanho e a cor antes de adicionar",
      message:
        "As peças favoritadas precisam ter uma variação disponível selecionada. Abra o produto desejado para escolher cor e tamanho.",
      showBagAction: false,
    });
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-brand-blush text-brand-primary inline-flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 fill-brand-primary" />
          </span>
          <div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum">
              {descriptor.title}
            </h1>
            <p className="text-xs sm:text-sm text-brand-muted">
              Peças que você se apaixonou{" "}
              <strong data-testid="favorites-saved-count" className="text-brand-primary">
                ({favoritesCount} {favoritesCount === 1 ? "peça salva" : "peças salvas"} neste
                aparelho)
              </strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {favorites.length > 0 && (
            <Button variant="secondary" size="sm" onClick={handleClearFavorites}>
              Limpar Favoritos
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={favorites.length === 0}
            onClick={handleAddAllToBag}
          >
            <ShoppingBag className="w-4 h-4" />
            Adicionar todos à sacola
          </Button>
        </div>
      </div>

      {transferNotice && (
        <Alert
          variant={transferNotice.variant}
          title={transferNotice.title}
          onClose={() => setTransferNotice(null)}
        >
          <span>{transferNotice.message}</span>
          {transferNotice.showBagAction && (
            <button
              type="button"
              onClick={() => navigate(ROUTES.store.bag)}
              className="font-bold underline text-brand-primary ml-2 cursor-pointer"
            >
              Ir para a Sacola →
            </button>
          )}
        </Alert>
      )}

      {favorites.length === 0 ? (
        <EmptyState
          title="Sua lista de desejos está vazia"
          description="Toque no coração das peças que você mais gostar no catálogo para salvá-las aqui."
          actionLabel="Explorar Coleção"
          onAction={() => navigate(ROUTES.store.catalog)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {favorites.map((fav) => {
            const catalogMatch = catalogById[fav.productId];
            const hasCompleteVariant = Boolean(
              fav.variantId?.trim() && fav.color?.trim() && fav.size?.trim()
            );
            const isOutOfStock = catalogMatch?.stockStatus === "out_of_stock";

            const cardSubtitle =
              catalogMatch?.subtitle ??
              (hasCompleteVariant
                ? `Cor ${fav.color} • Tamanho ${fav.size}`
                : "Selecione tamanho e cor na página do produto");

            const cardSizes = catalogMatch?.sizes ?? (fav.size ? [fav.size] : undefined);
            const cardColors = catalogMatch?.colors ?? (fav.colorHex ? [fav.colorHex] : undefined);

            const handleCardAction = () => {
              if (hasCompleteVariant && fav.variantId && fav.color && fav.size && !isOutOfStock) {
                addToCart(
                  {
                    productId: fav.productId,
                    variantId: fav.variantId,
                    name: fav.name,
                    category: fav.category,
                    color: fav.color,
                    colorHex: fav.colorHex || "#23101B",
                    size: fav.size,
                    unitPrice: fav.price,
                    imageUrl: fav.imageUrl,
                    imageAlt: fav.imageAlt,
                  },
                  1
                );
                removeFromFavorites(fav.productId);
                navigate(ROUTES.store.bag);
                return;
              }

              navigate(`/produto/${fav.productId}`);
            };

            return (
              <ProductCard
                key={fav.productId}
                id={fav.productId}
                name={fav.name}
                category={fav.category}
                subtitle={cardSubtitle}
                price={fav.price}
                installmentText={catalogMatch?.installmentText}
                imageUrl={fav.imageUrl ?? catalogMatch?.imageUrl}
                imageAlt={fav.imageAlt || catalogMatch?.imageAlt || fav.name}
                sizes={cardSizes}
                colors={cardColors}
                badgeText={catalogMatch?.badgeText}
                stockStatus={catalogMatch?.stockStatus ?? "available"}
                isFavorite={true}
                onToggleFavorite={(id) => removeFromFavorites(id)}
                actionLabel={
                  hasCompleteVariant && !isOutOfStock
                    ? "Adicionar à sacola"
                    : "Escolher tamanho e cor"
                }
                onAction={handleCardAction}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * C15 / Desktop Perfil da Cliente (/perfil)
 */
function StoreProfileScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
      {/* Banner Superior da Cliente VIP */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-brand-blush text-brand-primary font-editorial text-2xl font-bold inline-flex items-center justify-center shrink-0">
              MS
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum">
                  {descriptor.title}
                </h1>
                <Badge variant="blush">✨ CLIENTE VIP ENCANTADA</Badge>
              </div>
              <p className="text-xs text-brand-muted mt-0.5">
                Mariana Silva • WhatsApp: (11) 98765-4321 • Cliente desde Nov/2023
              </p>
              <p className="text-xs italic text-brand-primary mt-1">
                “Bem-vinda ao seu refúgio particular Menina Mulher.”
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-brand-soft border border-brand-border rounded-xl px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase text-brand-muted block">
                MIMOS VIP
              </span>
              <span className="font-editorial text-lg font-bold text-brand-plum">320 pts</span>
            </div>
            <div className="bg-brand-soft border border-brand-border rounded-xl px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase text-brand-muted block">
                CUPOM ATIVO
              </span>
              <span className="font-bold text-sm text-brand-primary">NIVERVIP15</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-brand-border">
          <div className="bg-brand-soft/60 rounded-xl p-3 flex items-center gap-3">
            <Heart className="w-5 h-5 text-brand-primary shrink-0" />
            <div>
              <p className="text-xs font-bold text-text-primary">3 itens</p>
              <p className="text-[11px] text-brand-muted">Lista de Desejos</p>
            </div>
          </div>
          <div className="bg-brand-soft/60 rounded-xl p-3 flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-brand-primary shrink-0" />
            <div>
              <p className="text-xs font-bold text-text-primary">2 pedidos</p>
              <p className="text-[11px] text-brand-muted">Concluídos com sucesso</p>
            </div>
          </div>
          <div className="bg-brand-soft/60 rounded-xl p-3 flex items-center gap-3">
            <Ruler className="w-5 h-5 text-brand-primary shrink-0" />
            <div>
              <p className="text-xs font-bold text-text-primary">Tamanho M</p>
              <p className="text-[11px] text-brand-muted">Medidas conferidas</p>
            </div>
          </div>
          <div className="bg-brand-soft/60 rounded-xl p-3 flex items-center gap-3">
            <Lock className="w-5 h-5 text-brand-primary shrink-0" />
            <div>
              <p className="text-xs font-bold text-text-primary">100% Discreto</p>
              <p className="text-[11px] text-brand-muted">Envio sigiloso ativado</p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de Histórico de Pedidos + Minhas Medidas (2 colunas no Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <section className="md:col-span-7 bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-editorial text-xl font-bold text-brand-plum">
                Histórico de Pedidos
              </h2>
              <p className="text-xs text-brand-muted">
                Acompanhe entregas, comprovantes e recompre favoritos
              </p>
            </div>
            <Badge variant="neutral">2 pedidos</Badge>
          </div>

          <div className="bg-brand-soft/60 border border-brand-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-brand-primary">#1042</span>
                <h3 className="text-sm font-bold text-text-primary">Pedido de Outubro</h3>
              </div>
              <Badge variant="available" dot>
                Entregue em Jardins, SP
              </Badge>
            </div>
            <p className="text-xs text-brand-muted">
              Sutiã Noir Renda (Tam 42) + Robe Seda Soft + Conjunto Merlot (Tam M)
            </p>
            <div className="pt-2 border-t border-brand-border flex flex-wrap items-center justify-between gap-2">
              <span className="font-editorial text-lg font-bold text-brand-plum">R$ 289,90</span>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.store.bag)}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Repetir Pedido
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-brand-soft/60 border border-brand-border rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-brand-muted">#1021</span>
                <h3 className="text-sm font-bold text-text-primary">
                  Kit 2x Calcinhas Renda Chantilly
                </h3>
              </div>
              <span className="font-bold text-sm text-text-primary">R$ 178,00</span>
            </div>
            <p className="text-xs text-brand-muted">Tamanho M • Cor Rosa Chá & Off-white</p>
          </div>
        </section>

        <section className="md:col-span-5 space-y-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-lg font-bold text-brand-plum">Minhas Medidas</h2>
              <Badge variant="blush">✓ Verificado</Badge>
            </div>
            <p className="text-xs text-brand-muted">
              Usamos estes dados para sugerir o tamanho ideal em cada modelagem:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-brand-soft rounded-xl p-3 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-brand-muted block">
                  BUSTO & COSTAS
                </span>
                <p className="font-editorial text-lg font-bold text-brand-plum">42 / M</p>
                <span className="text-[11px] text-brand-muted">~92 cm busto</span>
              </div>
              <div className="bg-brand-soft rounded-xl p-3 border border-brand-border">
                <span className="text-[10px] font-bold uppercase text-brand-muted block">
                  QUADRIL & CINTURA
                </span>
                <p className="font-editorial text-lg font-bold text-brand-plum">M / 98cm</p>
                <span className="text-[11px] text-brand-muted">Modelagem regular</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => navigate(ROUTES.store.sizeGuide)}
            >
              <Ruler className="w-4 h-4" />
              Abrir Guia “Como Medir”
            </Button>
          </div>

          <div className="bg-brand-blush/40 border border-brand-border rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Gift className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-brand-plum">
                  Você está a 1 compra de um Mimo Surpresa
                </p>
                <p className="text-xs text-brand-muted">
                  Complete seu próximo pedido pelo WhatsApp para resgatar.
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.store.catalog)}>
              Ver Coleção
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * RF10 — Guia de Medidas e Tamanhos (/guia-medidas)
 */
function StoreSizeGuideScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const navigate = useNavigate();

  const sizeRows = [
    {
      size: "P",
      num: "38 / 40",
      bust: "82 – 87 cm",
      underbust: "68 – 72 cm",
      waist: "64 – 70 cm",
      hip: "88 – 94 cm",
    },
    {
      size: "M",
      num: "42",
      bust: "88 – 93 cm",
      underbust: "73 – 77 cm",
      waist: "71 – 77 cm",
      hip: "95 – 101 cm",
    },
    {
      size: "G",
      num: "44",
      bust: "94 – 99 cm",
      underbust: "78 – 82 cm",
      waist: "78 – 85 cm",
      hip: "102 – 108 cm",
    },
    {
      size: "GG",
      num: "46 / 48",
      bust: "100 – 106 cm",
      underbust: "83 – 88 cm",
      waist: "86 – 94 cm",
      hip: "109 – 116 cm",
    },
  ];

  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <Badge variant="blush">CAIMENTO PERFEITO • RF10</Badge>
        <h1 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-bold text-brand-plum">
          {descriptor.title}
        </h1>
        <p className="text-sm sm:text-base text-text-secondary max-w-2xl">
          {descriptor.subtitle} Compare suas medidas em centímetros para escolher seu sutiã,
          calcinha ou conjunto com total segurança.
        </p>

        {/* Tabela de Medidas Responsiva */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-brand-soft text-xs font-bold uppercase tracking-wider text-brand-plum">
                <th className="py-3 px-4 rounded-tl-xl">Tamanho</th>
                <th className="py-3 px-4">Numeração</th>
                <th className="py-3 px-4">Busto</th>
                <th className="py-3 px-4">Tórax (Sub-busto)</th>
                <th className="py-3 px-4">Cintura</th>
                <th className="py-3 px-4 rounded-tr-xl">Quadril</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-xs sm:text-sm">
              {sizeRows.map((row) => (
                <tr key={row.size} className="hover:bg-brand-soft/50">
                  <td className="py-3.5 px-4 font-bold text-brand-primary">{row.size}</td>
                  <td className="py-3.5 px-4 font-semibold text-text-primary">{row.num}</td>
                  <td className="py-3.5 px-4 text-text-secondary">{row.bust}</td>
                  <td className="py-3.5 px-4 text-text-secondary">{row.underbust}</td>
                  <td className="py-3.5 px-4 text-text-secondary">{row.waist}</td>
                  <td className="py-3.5 px-4 text-text-secondary">{row.hip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Como tirar suas medidas (3 cards) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-2 shadow-xs">
          <Badge variant="brand">Passo 1</Badge>
          <h2 className="font-editorial text-lg font-bold text-brand-plum">Busto & Tórax</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Passe a fita métrica na parte mais saliente dos seios sem apertar. Em seguida, meça logo
            abaixo do busto (contorno do tórax).
          </p>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-2 shadow-xs">
          <Badge variant="brand">Passo 2</Badge>
          <h2 className="font-editorial text-lg font-bold text-brand-plum">Cintura Natural</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Meça a circunferência na parte mais fina do abdômen, aproximadamente dois dedos acima do
            umbigo.
          </p>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-2 shadow-xs">
          <Badge variant="brand">Passo 3</Badge>
          <h2 className="font-editorial text-lg font-bold text-brand-plum">Quadril</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Contorne a fita na região mais larga dos glúteos para garantir que a renda da calcinha
            abrace sem marcar.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-soft border border-brand-border rounded-2xl p-5">
        <p className="text-xs sm:text-sm text-brand-plum font-medium">
          Ficou entre dois tamanhos? Nossa renda possui elastano macio que se adapta perfeitamente.
        </p>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.store.catalog)}>
            Voltar ao Catálogo
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.open("https://wa.me/5511987654321", "_blank")}
          >
            <MessageCircle className="w-4 h-4" />
            Tirar Dúvida no WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}

function StoreRouteDispatcher({ descriptor }: { descriptor: RouteDescriptor }) {
  const location = useLocation();

  if (location.pathname.startsWith("/catalogo") || location.pathname.startsWith("/categoria/")) {
    return <StoreCatalogScreen descriptor={descriptor} />;
  }
  if (location.pathname.startsWith("/produto/")) {
    return <StoreProductDetailScreen descriptor={descriptor} products={PREVIEW_PRODUCTS} />;
  }
  if (location.pathname.startsWith("/sacola")) {
    return <StoreBagScreen descriptor={descriptor} />;
  }
  if (location.pathname.startsWith("/favoritos")) {
    return <StoreFavoritesScreen descriptor={descriptor} />;
  }
  if (location.pathname.startsWith("/perfil")) {
    return <StoreProfileScreen descriptor={descriptor} />;
  }
  if (location.pathname.startsWith("/guia-medidas")) {
    return <StoreSizeGuideScreen descriptor={descriptor} />;
  }
  return <StoreHomeScreen descriptor={descriptor} />;
}

function AdminRouteDispatcher({ descriptor }: { descriptor: RouteDescriptor }) {
  const location = useLocation();

  if (location.pathname.startsWith("/painel/estoque")) {
    return <AdminStockScreen descriptor={descriptor} />;
  }
  if (location.pathname === ROUTES.admin.newProduct || location.pathname.endsWith("/editar")) {
    return <AdminProductFormScreen descriptor={descriptor} />;
  }
  if (location.pathname.startsWith("/painel/produtos")) {
    return <AdminProductsScreen descriptor={descriptor} />;
  }
  return <AdminOrdersScreen descriptor={descriptor} />;
}

export function AppRoutes() {
  const loginDescriptor =
    ADMIN_ROUTE_DESCRIPTORS.find((d) => d.path === ROUTES.admin.login) ??
    ADMIN_ROUTE_DESCRIPTORS[0];
  const protectedAdminDescriptors = ADMIN_ROUTE_DESCRIPTORS.filter(
    (d) => d.path !== ROUTES.admin.login
  );

  return (
    <Routes>
      {/* Rotas Públicas da Loja com StoreLayout e StoreProvider */}
      <Route
        element={
          <StoreProvider>
            <StoreLayout />
          </StoreProvider>
        }
      >
        {STORE_ROUTE_DESCRIPTORS.map((descriptor) => (
          <Route
            key={descriptor.path}
            path={descriptor.path}
            element={<StoreRouteDispatcher descriptor={descriptor} />}
          />
        ))}
      </Route>

      {/* Rota Pública de Login da Empresária (/painel/login) */}
      <Route
        path={ROUTES.admin.login}
        element={<AdminLoginScreen descriptor={loginDescriptor} />}
      />

      {/* Rota base do Painel redireciona para Gestão de Pedidos */}
      <Route path={ROUTES.admin.root} element={<Navigate to={ROUTES.admin.orders} replace />} />

      {/* Rotas Privadas do Painel da Empresária (/painel/*) protegidas por ProtectedAdminRoute */}
      <Route element={<ProtectedAdminRoute />}>
        {protectedAdminDescriptors.map((descriptor) => (
          <Route
            key={descriptor.path}
            path={descriptor.path}
            element={<AdminRouteDispatcher descriptor={descriptor} />}
          />
        ))}
      </Route>

      {/* Fallback para rotas não encontradas */}
      <Route path="*" element={<Navigate to={ROUTES.store.home} replace />} />
    </Routes>
  );
}
