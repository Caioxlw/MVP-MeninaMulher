import {
  AlertTriangle,
  ClipboardCheck,
  Edit3,
  Eye,
  Gift,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { StoreLayout } from "../components/layout/StoreLayout";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  ProductCard,
  type ProductStockStatus,
} from "../components/ui";
import { AdminLoginScreen, ProtectedAdminRoute } from "../pages/admin/AdminLoginScreen";
import { AdminStockScreen } from "../pages/admin/AdminStockScreen";
import { StoreProductDetailScreen } from "../pages/store/StoreProductDetailScreen";
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

interface BagItem {
  id: string;
  tag: string;
  name: string;
  color: string;
  colorHex: string;
  size: string;
  unitPrice: number;
  qty: number;
}

const INITIAL_BAG_ITEMS: BagItem[] = [
  {
    id: "sutia-renda-noir",
    tag: "RENDA NOBRE",
    name: "Sutiã Renda Floral",
    color: "Preto",
    colorHex: "#23101B",
    size: "P",
    unitPrice: 119.9,
    qty: 1,
  },
  {
    id: "calcinha-algodao-doce",
    tag: "CONFORTO PURO",
    name: "Calcinha Algodão Doce",
    color: "Rosa",
    colorHex: "#F5CCD0",
    size: "M",
    unitPrice: 39.9,
    qty: 2,
  },
  {
    id: "conjunto-microfibra-nude",
    tag: "ÚLTIMAS UNIDADES",
    name: "Conjunto Microfibra Nude",
    color: "Nude",
    colorHex: "#E5C3B5",
    size: "M",
    unitPrice: 149.9,
    qty: 1,
  },
];

const ADMIN_CATALOG_PRODUCTS = [
  {
    id: "sutia-renda-noir",
    name: "Sutiã Renda Noir",
    sku: "MM-LACE-0912",
    tag: "Alta Procura",
    category: "Partes de Cima",
    collection: "Coleção Romance",
    price: "R$ 99,90",
    originalPrice: "R$ 119,90",
    promo: "Promoção -17%",
    totalUnits: "24 peças totais",
    grades: [
      { size: "P", qty: 6 },
      { size: "M", qty: 10 },
      { size: "G", qty: 8 },
      { size: "GG", qty: 0 },
    ],
    status: "available" as const,
    statusLabel: "Visível",
    visible: true,
  },
  {
    id: "conjunto-slip-seda",
    name: "Conjunto Slip Seda Rosé",
    sku: "MM-SILK-4402",
    category: "Noite & Seda",
    collection: "Linha Premium",
    price: "R$ 249,00",
    promo: "Preço regular",
    totalUnits: "3 peças totais",
    grades: [
      { size: "P", qty: 1 },
      { size: "M", qty: 2 },
      { size: "G", qty: 0 },
    ],
    status: "lowStock" as const,
    statusLabel: "Últimas Unidades",
    visible: true,
  },
  {
    id: "calcinha-chantilly",
    name: "Calcinha Cintura Alta Chantilly",
    sku: "MM-BRI-0018",
    category: "Partes de Baixo",
    collection: "Noivas & Celebração",
    price: "R$ 68,00",
    promo: "Preço regular",
    totalUnits: "0 peças (Esgotado)",
    grades: [
      { size: "P", qty: 0 },
      { size: "M", qty: 0 },
      { size: "G", qty: 0 },
    ],
    status: "outOfStock" as const,
    statusLabel: "Esgotado",
    visible: false,
  },
  {
    id: "body-red-velvet",
    name: "Body Red Velvet Sensual",
    sku: "MM-BDY-7731",
    category: "Conjuntos",
    collection: "Linha Íntima Glamour",
    price: "R$ 189,90",
    promo: "Preço regular",
    totalUnits: "18 peças totais",
    grades: [
      { size: "P", qty: 5 },
      { size: "M", qty: 8 },
      { size: "G", qty: 5 },
    ],
    status: "neutral" as const,
    statusLabel: "Oculto",
    visible: false,
  },
];

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/* ============================================================================
 * TELAS DA LOJA (CLIENTE)
 * ============================================================================ */

/**
 * C01 / Desktop Home — Página Inicial da Loja (/)
 */
function StoreHomeScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [favorites, setFavorites] = useState<string[]>(["sutia-renda-noir"]);
  const [filterText, setFilterText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");

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

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const filteredProducts = PREVIEW_PRODUCTS.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(filterText.trim().toLowerCase());
    const matchesCategory =
      selectedCategory === "Todos" || p.category.toLowerCase() === selectedCategory.toLowerCase();
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
              {["Todos", "Partes de Cima", "Partes de Baixo", "Conjuntos"].map((cat) => (
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

        {filteredProducts.length > 0 ? (
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
                sizes={product.sizes}
                colors={product.colors}
                badgeText={product.badgeText}
                stockStatus={product.stockStatus}
                isFavorite={favorites.includes(product.id)}
                onToggleFavorite={toggleFavorite}
                onAction={(id) => navigate(`/produto/${id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma peça encontrada"
            description="Não encontramos peças para o filtro selecionado. Limpe a busca para ver toda a coleção."
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
  const [selectedColor, setSelectedColor] = useState("Todas");
  const [selectedSize, setSelectedSize] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(["sutia-renda-noir"]);

  const slugMap: Record<string, string> = {
    "partes-de-cima": "Partes de Cima",
    "partes-de-baixo": "Partes de Baixo",
    conjuntos: "Conjuntos",
  };
  const categoryFilterName = params.slug ? (slugMap[params.slug] ?? null) : null;

  const filteredProducts = PREVIEW_PRODUCTS.filter((p) => {
    const matchesCategory =
      !categoryFilterName || p.category.toLowerCase() === categoryFilterName.toLowerCase();
    const matchesColor = selectedColor === "Todas" || p.colorNames.includes(selectedColor);
    const matchesSize = selectedSize === "Todos" || p.sizes.includes(selectedSize);
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesCategory && matchesColor && matchesSize && matchesQuery;
  });

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

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

        {/* Filtros de Cor e Tamanho (conforme protótipo C04 Categoria) */}
        <div className="pt-4 border-t border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted mr-1">
              COR:
            </span>
            {["Todas", "Preto", "Cinza", "Rosa", "Vinho", "Branco"].map((color) => (
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
            {["Todos", "P", "M", "G", "GG"].map((size) => (
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
      {filteredProducts.length > 0 ? (
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
              sizes={product.sizes}
              colors={product.colors}
              badgeText={product.badgeText}
              stockStatus={product.stockStatus}
              isFavorite={favorites.includes(product.id)}
              onToggleFavorite={toggleFavorite}
              onAction={(id) => navigate(`/produto/${id}`)}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title="Nenhuma peça encontrada com esses filtros"
          description="Tente selecionar outra cor ou tamanho para ver mais opções da coleção."
          actionLabel="Limpar Filtros"
          onAction={() => {
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
 * C09 / Desktop Sacola de Compras (/sacola)
 */
function StoreBagScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const [items, setItems] = useState<BagItem[]>(INITIAL_BAG_ITEMS);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");

  const updateItemQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCount = items.reduce((acc, item) => acc + item.qty, 0);
  const totalAmount = items.reduce((acc, item) => acc + item.unitPrice * item.qty, 0);

  const whatsappMessageLines = [
    "Olá, Menina Mulher Lingerie! Gostaria de fazer o pedido:",
    ...items.map(
      (item) =>
        `- ${item.qty}x ${item.name} (${item.color}, Tam ${item.size}) - ${formatBRL(
          item.unitPrice * item.qty
        )}`
    ),
    `Forma de envio: ${deliveryType === "pickup" ? "Retirada no Ateliê" : "Entrega / Motoboy"}`,
    customerName ? `Cliente: ${customerName}` : null,
    notes ? `Obs: ${notes}` : null,
    `Total: ${formatBRL(totalAmount)}`,
  ].filter(Boolean);

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
            <Badge variant="blush">{totalCount} itens selecionados</Badge>
          </div>
        </div>
        <Badge variant="neutral">Compra direta sem cadastro • Pedido 100% via WhatsApp</Badge>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Sua sacola está vazia"
          description="Explore o catálogo da Menina Mulher para adicionar suas peças favoritas e enviar o pedido pronto pelo WhatsApp."
          actionLabel="Restaurar Peças de Demonstração"
          onAction={() => setItems(INITIAL_BAG_ITEMS)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          {/* Coluna Esquerda: Lista de Itens na Sacola */}
          <section className="md:col-span-7 space-y-4">
            <Alert variant="info" title="Seus itens ficam salvos no seu navegador!">
              Não precisa criar conta nem fazer login. Sua seleção continua esperando por você com
              todo o carinho.
            </Alert>

            <div className="space-y-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-24 rounded-xl bg-brand-soft border border-brand-border flex flex-col items-center justify-center p-2 shrink-0">
                      <span className="text-[9px] font-bold uppercase text-brand-primary text-center leading-tight mb-1">
                        {item.tag}
                      </span>
                      <span className="font-editorial font-bold text-brand-plum">MM</span>
                    </div>

                    <div className="space-y-1.5">
                      <h2 className="font-editorial text-base sm:text-lg font-bold text-brand-plum">
                        {item.name}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-brand-muted">
                        <span
                          className="w-3 h-3 rounded-full border border-brand-border"
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

                      <div className="inline-flex items-center gap-2 bg-brand-soft border border-brand-border rounded-xl p-1 mt-1">
                        <button
                          type="button"
                          aria-label={`Diminuir quantidade de ${item.name}`}
                          onClick={() => updateItemQty(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-brand-surface text-brand-plum inline-flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="min-w-[24px] text-center text-xs font-bold">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Aumentar quantidade de ${item.name}`}
                          onClick={() => updateItemQty(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-brand-surface text-brand-plum inline-flex items-center justify-center cursor-pointer"
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
                      onClick={() => removeItem(item.id)}
                      className="text-brand-muted hover:text-status-danger p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="text-right">
                      {item.qty > 1 && (
                        <span className="text-[11px] text-brand-muted block">
                          {item.qty}x {formatBRL(item.unitPrice)}
                        </span>
                      )}
                      <span className="font-editorial text-lg font-bold text-brand-plum">
                        {formatBRL(item.unitPrice * item.qty)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
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
                <span className="text-brand-muted">Subtotal ({totalCount} peças)</span>
                <strong className="text-text-primary">{formatBRL(totalAmount)}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">Envio & Entrega</span>
                <span className="font-bold text-brand-primary">A combinar</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeliveryType("pickup")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                    deliveryType === "pickup"
                      ? "bg-brand-surface border-brand-primary text-brand-primary"
                      : "bg-brand-surface border-brand-border text-brand-muted"
                  }`}
                >
                  ● Retirada na loja
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("delivery")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                    deliveryType === "delivery"
                      ? "bg-brand-surface border-brand-primary text-brand-primary"
                      : "bg-brand-surface border-brand-border text-brand-muted"
                  }`}
                >
                  ○ Entrega / Motoboy
                </button>
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
                  "_blank"
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
    </div>
  );
}

/**
 * C11 — Tela de Favoritos (/favoritos)
 */
function StoreFavoritesScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const navigate = useNavigate();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([
    "sutia-renda-noir",
    "calcinha-algodao-doce",
    "conjunto-microfibra-nude",
  ]);

  const favoriteProducts = PREVIEW_PRODUCTS.filter((p) => favoriteIds.includes(p.id));

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
              <strong className="text-brand-primary">
                ({favoriteProducts.length} peças salvas neste aparelho)
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {favoriteProducts.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => setFavoriteIds([])}>
              Limpar Favoritos
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setFavoriteIds([
                  "sutia-renda-noir",
                  "calcinha-algodao-doce",
                  "conjunto-microfibra-nude",
                ])
              }
            >
              Restaurar Favoritos
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.store.bag)}>
            <ShoppingBag className="w-4 h-4" />
            Adicionar todos à sacola
          </Button>
        </div>
      </div>

      {favoriteProducts.length === 0 ? (
        <EmptyState
          title="Sua lista de desejos está vazia"
          description="Toque no coração das peças que você mais gostar no catálogo para salvá-las aqui."
          actionLabel="Explorar Coleção"
          onAction={() => navigate(ROUTES.store.catalog)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {favoriteProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              category={product.category}
              subtitle={product.subtitle}
              price={product.price}
              installmentText={product.installmentText}
              sizes={product.sizes}
              colors={product.colors}
              badgeText={product.badgeText}
              stockStatus={product.stockStatus}
              isFavorite={true}
              onToggleFavorite={(id) =>
                setFavoriteIds((prev) => prev.filter((item) => item !== id))
              }
              actionLabel="Adicionar à sacola"
              onAction={() => navigate(ROUTES.store.bag)}
            />
          ))}
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

/* ============================================================================
 * TELAS DO PAINEL DA EMPRESÁRIA (/painel/*)
 * ============================================================================ */

function AdminOrdersScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const location = useLocation();
  const [selectedOrderId, setSelectedOrderId] = useState<string>("#1042");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Badge variant="blush" className="mb-2">
              Painel de Vendas em Tempo Real • Rota: {location.pathname}
            </Badge>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum mb-1">
              {descriptor.title}
            </h1>
            <p className="text-sm text-text-secondary">{descriptor.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand" dot>
              2 Pendentes
            </Badge>
            <Badge variant="available">14 Confirmados</Badge>
            <Badge variant="lowStock">1 Com Alerta de Estoque</Badge>
            <Badge variant="neutral">3 Cancelados</Badge>
          </div>
        </div>

        <Alert
          variant={orderConfirmed ? "success" : "info"}
          title={
            orderConfirmed
              ? "Pedido #1042 confirmado e estoque atualizado!"
              : "Baixa Automática Sincronizada"
          }
        >
          Ao confirmar o pedido, o sistema debita imediatamente as peças do inventário da boutique e
          atualiza os contadores em sua vitrine online.
        </Alert>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <section className="md:col-span-5 space-y-3">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-3 space-y-3">
            <div className="grid grid-cols-3 gap-1 bg-brand-soft p-1 rounded-xl text-xs font-semibold text-center">
              <span className="bg-brand-surface text-brand-primary py-1.5 rounded-xl shadow-xs">
                Pendentes (2)
              </span>
              <span className="text-brand-muted py-1.5">Confirmados (14)</span>
              <span className="text-brand-muted py-1.5">Cancelados (3)</span>
            </div>
            <Input
              label="Buscar pedido"
              placeholder="Buscar por cliente, telefone ou #..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div
            onClick={() => setSelectedOrderId("#1042")}
            className={`bg-brand-surface rounded-2xl p-4 shadow-xs cursor-pointer transition-colors ${
              selectedOrderId === "#1042"
                ? "border-2 border-brand-primary"
                : "border border-brand-border hover:border-brand-primary/40"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-editorial text-base font-bold text-brand-primary">#1042</span>
                <Badge variant={orderConfirmed ? "available" : "blush"}>
                  {orderConfirmed ? "Confirmado" : "PENDENTE"}
                </Badge>
              </div>
              <span className="text-base font-bold text-text-primary">R$ 349,60</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-text-primary">Mariana Silva</p>
              <span className="text-xs text-brand-muted">3 itens</span>
            </div>
            <div className="mt-3 pt-2 border-t border-brand-border flex items-center justify-between text-xs">
              <span className="text-status-success font-medium">
                Recebido há 15 min via WhatsApp
              </span>
              <span className="font-semibold text-brand-primary">Visualizando →</span>
            </div>
          </div>

          <div
            onClick={() => setSelectedOrderId("#1040")}
            className={`bg-brand-surface rounded-2xl p-4 shadow-xs cursor-pointer transition-colors ${
              selectedOrderId === "#1040"
                ? "border-2 border-brand-primary"
                : "border border-brand-border hover:border-brand-primary/40"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-editorial text-base font-bold text-text-primary">#1040</span>
                <Badge variant="outOfStock" dot>
                  Falta Estoque (1 un.)
                </Badge>
              </div>
              <span className="text-base font-bold text-text-primary">R$ 79,80</span>
            </div>
            <p className="text-sm font-bold text-text-primary">Camila Rocha</p>
            <p className="text-xs text-status-danger font-medium mt-1">
              Item esgotado: Calcinha Soft Touch (G)
            </p>
            <div className="mt-3 pt-2 border-t border-brand-border flex items-center justify-between text-xs text-brand-muted">
              <span>Hoje às 12:15</span>
              <span>(11) 97123-4567</span>
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-editorial text-base font-bold text-text-primary">#1039</span>
                <Badge variant="available">Confirmado · Baixa Realizada</Badge>
              </div>
              <span className="text-base font-bold text-text-primary">R$ 220,00</span>
            </div>
            <p className="text-sm font-semibold text-text-primary">Juliana Mendes</p>
            <div className="mt-2 pt-2 border-t border-brand-border flex items-center justify-between text-xs text-brand-muted">
              <span>✓ Hoje às 11:40</span>
              <span>Pronto para entrega</span>
            </div>
          </div>
        </section>

        <section className="md:col-span-7 bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-brand-border">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-editorial text-2xl font-bold text-brand-primary">
                  Pedido {selectedOrderId}
                </h2>
                <Badge variant={orderConfirmed ? "available" : "blush"}>
                  {orderConfirmed ? "CONFIRMADO" : "AGUARDANDO CONFIRMAÇÃO"}
                </Badge>
              </div>
              <p className="text-xs text-brand-muted mt-1">
                Recebido hoje às 14:32 • Reserva automática ativa
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.open("https://wa.me/5511987654321", "_blank")}
            >
              <MessageCircle className="w-4 h-4" />
              Contatar Cliente via WhatsApp
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-brand-soft/60 border border-brand-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  DADOS DA CLIENTE
                </span>
                <Badge variant="blush">Cliente Frequente</Badge>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-brand-blush text-brand-primary font-bold text-xs inline-flex items-center justify-center">
                  MS
                </span>
                <div>
                  <p className="text-sm font-bold text-text-primary">Mariana Silva</p>
                  <p className="text-xs text-brand-muted flex items-center gap-1">
                    <Phone className="w-3 h-3" /> (11) 98765-4321
                  </p>
                </div>
              </div>
              <p className="text-xs italic text-brand-muted bg-brand-surface p-2.5 rounded-xl border border-brand-border">
                “Olá! Por favor, embalar com papel de seda perfumado para presente.”
              </p>
            </div>

            <div className="bg-brand-soft/60 border border-brand-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  ENTREGA & LOGÍSTICA
                </span>
                <Badge variant="neutral">Motoboy Express</Badge>
              </div>
              <p className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-brand-primary" /> Envio Domiciliar
              </p>
              <p className="text-xs text-brand-muted">
                Alameda Lorena, 1420 - Apto 82 • Jardins, São Paulo - SP
              </p>
              <p className="text-[11px] font-semibold text-brand-plum bg-brand-surface p-2 rounded-xl border border-brand-border">
                Janela preferencial: Sábado das 10h às 13h
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-editorial text-lg font-bold text-brand-plum">
                  Peças Selecionadas
                </h3>
                <Badge variant="brand">3 itens</Badge>
              </div>
              <span className="text-xs text-brand-muted">
                Conferência com inventário em tempo real
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="bg-brand-soft rounded-xl p-3.5 flex items-center justify-between gap-3 border border-brand-border">
                <div>
                  <p className="text-sm font-bold text-text-primary">Sutiã Renda Noir</p>
                  <p className="text-xs text-brand-muted mb-1">
                    Tam: P • Cor: Preto Nobre • 1 unidade
                  </p>
                  <Badge variant="blush" dot>
                    Estoque Atual: 4 un. → Ficará: 3 un.
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-brand-primary block">R$ 119,90</span>
                  <span className="text-[11px] text-brand-muted">Unitário R$ 119,90</span>
                </div>
              </div>

              <div className="bg-brand-soft rounded-xl p-3.5 flex items-center justify-between gap-3 border border-brand-border">
                <div>
                  <p className="text-sm font-bold text-text-primary">Calcinha Algodão Doce</p>
                  <p className="text-xs text-brand-muted mb-1">
                    Tam: M • Cor: Rosa Pétala • 2 unidades
                  </p>
                  <Badge variant="blush" dot>
                    Estoque Atual: 6 un. → Ficará: 4 un.
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-brand-primary block">R$ 79,80</span>
                  <span className="text-[11px] text-brand-muted">2 × R$ 39,90</span>
                </div>
              </div>

              <div className="bg-brand-soft rounded-xl p-3.5 flex items-center justify-between gap-3 border border-brand-border">
                <div>
                  <p className="text-sm font-bold text-text-primary">Conjunto Microfibra Nude</p>
                  <p className="text-xs text-brand-muted mb-1">
                    Tam: M • Cor: Nude Essência • 1 unidade
                  </p>
                  <Badge variant="blush" dot>
                    Estoque Atual: 3 un. → Ficará: 2 un.
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-brand-primary block">R$ 149,90</span>
                  <span className="text-[11px] text-brand-muted">Unitário R$ 149,90</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-brand-muted block">
                Total a Receber (4 peças • Frete Cortesia)
              </span>
              <span className="font-editorial text-2xl font-bold text-brand-primary">
                R$ 349,60
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm">
                Cancelar Pedido
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsConfirmModalOpen(true)}>
                Confirmar Pedido & Baixar Estoque
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        subtitle="CONFIRMAÇÃO DE RESERVA • PEDIDO #1042"
        title="Confirmar Pedido & Baixa no Estoque"
        description="Ao confirmar este pedido, as peças serão debitadas automaticamente do estoque físico da boutique e sincronizadas na vitrine virtual:"
        icon={<ClipboardCheck className="w-5 h-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setOrderConfirmed(true);
                setIsConfirmModalOpen(false);
              }}
            >
              Sim, Confirmar Pedido
            </Button>
          </>
        }
      >
        <div className="bg-brand-soft rounded-xl p-3 space-y-2 border border-brand-border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text-primary">Sutiã Renda Noir (P)</span>
            <Badge variant="outOfStock">4 un. → 3 un. (-1 un.)</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text-primary">Calcinha Algodão Doce (M)</span>
            <Badge variant="outOfStock">6 un. → 4 un. (-2 un.)</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text-primary">Conjunto Microfibra Nude (M)</span>
            <Badge variant="outOfStock">3 un. → 2 un. (-1 un.)</Badge>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AdminProductsScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Todos (48)");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const filteredCatalog = ADMIN_CATALOG_PRODUCTS.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant="blush">48 Produtos Ativos</Badge>
            <span className="text-xs text-brand-muted">Rota: {location.pathname}</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum">
            {descriptor.title}
          </h1>
          <p className="text-sm text-text-secondary">{descriptor.subtitle}</p>
          {params.id && (
            <p className="mt-1 text-sm font-semibold text-brand-primary">
              Editando produto ID: {params.id}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="primary" onClick={() => setIsNewModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Cadastrar Novo Produto
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
              VALOR EM ESTOQUE
            </span>
            <p className="font-editorial text-xl sm:text-2xl font-bold text-text-primary mt-1">
              R$ 54.890
            </p>
            <span className="text-xs text-brand-primary font-medium">382 peças auditadas</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-brand-blush text-brand-primary inline-flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
              NA VITRINE PRINCIPAL
            </span>
            <p className="font-editorial text-xl sm:text-2xl font-bold text-text-primary mt-1">
              42 Peças
            </p>
            <span className="text-xs text-status-success font-medium">87.5% de alcance ativo</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-brand-blush text-brand-primary inline-flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
              ATENÇÃO REPOSIÇÃO
            </span>
            <p className="font-editorial text-xl sm:text-2xl font-bold text-status-warning mt-1">
              5 Modelos
            </p>
            <span className="text-xs text-brand-muted">Últimas unidades</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-status-warning-bg text-status-warning inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
              ESGOTADOS
            </span>
            <p className="font-editorial text-xl sm:text-2xl font-bold text-status-danger mt-1">
              3 Peças
            </p>
            <span className="text-xs text-brand-muted">Grade zerada</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-status-danger-bg text-status-danger inline-flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </span>
        </div>
      </section>

      <section className="bg-brand-surface border border-brand-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="w-full md:w-80">
            <Input
              label="Buscar peça no catálogo"
              placeholder="Buscar por nome da lingerie, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              "Todos (48)",
              "Visíveis (42)",
              "Ocultos (6)",
              "Últimas Unidades (5)",
              "Esgotados (3)",
            ].map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => setSelectedFilter(pill)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  selectedFilter === pill
                    ? "bg-brand-primary text-white"
                    : "bg-brand-soft text-brand-muted hover:text-brand-plum"
                }`}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-brand-border">
          {filteredCatalog.map((item) => (
            <div
              key={item.id}
              className="py-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center"
            >
              <div className="md:col-span-4 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-brand-soft border border-brand-border flex items-center justify-center font-editorial font-bold text-brand-plum shrink-0">
                  MM
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-plum">{item.name}</p>
                  <p className="text-xs text-brand-muted">SKU: {item.sku}</p>
                  {item.tag && (
                    <span className="text-[11px] font-semibold text-brand-primary">{item.tag}</span>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-bold text-text-primary">{item.category}</p>
                <p className="text-[11px] text-brand-muted">{item.collection}</p>
              </div>

              <div className="md:col-span-2">
                <span className="text-sm font-bold text-text-primary">{item.price}</span>
                {item.originalPrice && (
                  <span className="text-xs text-brand-muted line-through ml-1.5">
                    {item.originalPrice}
                  </span>
                )}
                <p className="text-[11px] text-brand-primary font-medium">{item.promo}</p>
              </div>

              <div className="md:col-span-2 space-y-1">
                <p className="text-xs font-bold text-text-primary">{item.totalUnits}</p>
                <div className="flex flex-wrap gap-1">
                  {item.grades.map((g) => (
                    <span
                      key={g.size}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        g.qty > 0
                          ? "bg-brand-blush/60 text-brand-plum"
                          : "bg-brand-soft text-brand-muted line-through"
                      }`}
                    >
                      {g.size} {g.qty}
                    </span>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2 w-full">
                <Badge variant={item.status} dot>
                  {item.statusLabel}
                </Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/painel/produtos/${item.id}/editar`)}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        subtitle="CATÁLOGO MENINA MULHER"
        title="Ficha da Peça"
        description="Preencha os dados da peça, preço e grade inicial de tamanhos e cores."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsNewModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => setIsNewModalOpen(false)}>
              Salvar no Catálogo
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nome da Peça" defaultValue="Sutiã Renda Noir" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Categoria" defaultValue="Partes de Cima" />
            <Input label="Preço de Venda (R$)" defaultValue="119,90" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AdminRouteDispatcher({ descriptor }: { descriptor: RouteDescriptor }) {
  const location = useLocation();

  if (location.pathname.startsWith("/painel/estoque")) {
    return <AdminStockScreen descriptor={descriptor} />;
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
      {/* Rotas Públicas da Loja com StoreLayout */}
      <Route element={<StoreLayout />}>
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
