import { ClipboardCheck, Mail, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "../components/layout/AdminLayout";
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
  badgeText?: string;
  stockStatus: ProductStockStatus;
}> = [
  {
    id: "sutia-renda-noir",
    category: "Partes de Cima",
    name: "Sutiã Renda Noir",
    subtitle: "Toque aveludado e suave",
    price: 119.9,
    installmentText: "3x s/ juros",
    sizes: ["P", "M", "G"],
    colors: ["#23101B", "#D1025A", "#F5CCD0"],
    badgeText: "Destaque",
    stockStatus: "available",
  },
  {
    id: "calcinha-algodao-doce",
    category: "Partes de Baixo",
    name: "Calcinha Algodão Doce",
    subtitle: "Respirável e diária",
    price: 39.9,
    installmentText: "À vista",
    sizes: ["M", "G"],
    colors: ["#F5CCD0", "#FFFFFF"],
    badgeText: "100% Algodão",
    stockStatus: "available",
  },
  {
    id: "conjunto-microfibra-nude",
    category: "Conjuntos",
    name: "Conjunto Microfibra",
    subtitle: "Tecido toque de seda",
    price: 149.9,
    installmentText: "4x s/ juros",
    sizes: ["P", "M", "G"],
    colors: ["#E5C3B5", "#520139"],
    stockStatus: "low_stock",
  },
  {
    id: "body-renda-floral",
    category: "Partes de Cima",
    name: "Body Renda",
    subtitle: "Decote costas cavadas",
    price: 99.9,
    installmentText: "Consulte reposição",
    sizes: ["P", "M"],
    colors: ["#23101B"],
    stockStatus: "out_of_stock",
  },
];

function StoreRoutePlaceholder({ descriptor }: { descriptor: RouteDescriptor }) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [favorites, setFavorites] = useState<string[]>(["sutia-renda-noir"]);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    if (location.pathname !== ROUTES.store.home) return;
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
  }, [location.pathname]);

  const isConnected = health?.services?.database?.status === "connected";

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const filteredProducts = PREVIEW_PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(filterText.trim().toLowerCase())
  );

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-8 lg:space-y-12">
      {/* Banner / Hero Responsivo: 1 coluna no Mobile, 2 colunas (7 + 5) no Desktop */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-8 lg:p-10 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="blush">Loja Pública • Rota: {location.pathname}</Badge>
              {location.pathname === ROUTES.store.home && (
                <Badge variant="available" dot>
                  {isConnected ? "Conectado" : "Verificando API"}
                </Badge>
              )}
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-plum leading-tight">
              {descriptor.title}
            </h1>
            <p className="text-sm sm:text-base text-text-secondary max-w-2xl">
              {descriptor.subtitle}
            </p>

            {(params.slug || params.id) && (
              <p className="text-sm font-medium text-brand-primary">
                Parâmetro selecionado: {params.slug ?? params.id}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button variant="primary" onClick={() => navigate(ROUTES.store.catalog)}>
                Ver Catálogo Completo
              </Button>
              <Button variant="secondary" onClick={() => navigate(ROUTES.store.sizeGuide)}>
                Guia de Medidas
              </Button>
            </div>

            {/* Pílulas de diferencial (visíveis em Grid Responsivo 1 col -> 3 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-brand-soft border border-brand-border rounded-xl p-3">
                <p className="text-xs font-bold text-brand-plum">Do P ao GG</p>
                <p className="text-[11px] text-brand-muted">Caimento anatômico</p>
              </div>
              <div className="bg-brand-soft border border-brand-border rounded-xl p-3">
                <p className="text-xs font-bold text-brand-plum">Atendimento 1 a 1</p>
                <p className="text-[11px] text-brand-muted">Direto pelo WhatsApp</p>
              </div>
              <div className="bg-brand-soft border border-brand-border rounded-xl p-3">
                <p className="text-xs font-bold text-brand-plum">Sem Cadastro</p>
                <p className="text-[11px] text-brand-muted">Rápido e sem senhas</p>
              </div>
            </div>
          </div>

          {/* Coluna Direita do Hero no Desktop */}
          <div className="lg:col-span-5">
            <div className="bg-brand-soft border border-brand-border rounded-2xl p-6 lg:p-8 flex flex-col justify-between min-h-[220px] lg:min-h-[280px]">
              <div>
                <Badge variant="blush" className="mb-3">
                  Sensualidade & Cuidado
                </Badge>
                <h2 className="font-editorial text-xl lg:text-2xl font-bold text-brand-plum mb-2">
                  Feito para abraçar a sua essência.
                </h2>
                <p className="text-xs sm:text-sm text-brand-muted">
                  Nossas peças celebram cada curva com conforto puro, renda delicada e a doce
                  liberdade de se sentir plenamente você.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between text-xs">
                <span className="font-semibold text-brand-plum">Rendas Nobres & Microfibra</span>
                <Badge variant="brand">100% Brasil</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grade Responsiva do Catálogo com ProductCard, Input e EmptyState */}
      <section aria-label="Prévia da grade responsiva da loja" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary block">
              Catálogo Selecionado
            </span>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-brand-plum">
              Explore Nossas Peças
            </h2>
          </div>

          <div className="w-full md:w-72">
            <Input
              label="Filtrar vitrine"
              placeholder="Ex.: Sutiã, Calcinha..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
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
            description="Não encontramos peças para o filtro digitado. Limpe a busca para ver toda a coleção."
            actionLabel="Limpar filtro"
            onAction={() => setFilterText("")}
          />
        )}
      </section>
    </div>
  );
}

function AdminRoutePlaceholder({ descriptor }: { descriptor: RouteDescriptor }) {
  const params = useParams();
  const location = useLocation();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Cabeçalho da Página do Painel */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <Badge variant="blush" className="mb-2">
              Área Administrativa • Rota: {location.pathname}
            </Badge>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum mb-1">
              {descriptor.title}
            </h1>
            <p className="text-sm text-text-secondary">{descriptor.subtitle}</p>
            {params.id && (
              <p className="mt-2 text-sm font-medium text-brand-primary">
                ID do produto: {params.id}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand" dot>
              2 Pendentes
            </Badge>
            <Badge variant="available">14 Confirmados</Badge>
            <Badge variant="lowStock">1 Alerta de Estoque</Badge>
          </div>
        </div>

        {/* Aviso Rápido (Alert) */}
        <Alert
          variant={orderConfirmed ? "success" : "info"}
          title={
            orderConfirmed
              ? "Pedido #1042 confirmado e estoque atualizado!"
              : "Baixa Automática Sincronizada"
          }
        >
          Ao confirmar o pedido, o sistema debita imediatamente as peças do inventário da boutique e
          atualiza a vitrine online.
        </Alert>
      </section>

      {/* Visão Master-Detail Responsiva: 1 coluna empilhada no Celular, 12 colunas (5 + 7) no Computador */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 space-y-3">
          <div className="bg-brand-surface border-2 border-brand-primary rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-editorial text-base font-bold text-brand-plum">
                Pedido #1042
              </span>
              <Badge variant={orderConfirmed ? "available" : "blush"}>
                {orderConfirmed ? "Confirmado" : "Pendente"}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-text-primary">Mariana Silva</p>
            <p className="text-xs text-brand-muted mb-3">Recebido via WhatsApp • 3 peças</p>
            <div className="pt-2 border-t border-brand-border flex items-center justify-between">
              <span className="text-base font-bold text-brand-primary">R$ 349,60</span>
              <span className="text-xs font-semibold text-brand-primary">Ver detalhes →</span>
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-editorial text-base font-bold text-brand-plum">
                Pedido #1040
              </span>
              <Badge variant="outOfStock">Atenção Estoque</Badge>
            </div>
            <p className="text-sm font-semibold text-text-primary">Camila Rocha</p>
            <p className="text-xs text-brand-muted mb-3">Recebido via WhatsApp • 2 peças</p>
            <div className="pt-2 border-t border-brand-border flex items-center justify-between">
              <span className="text-base font-bold text-brand-primary">R$ 79,80</span>
              <span className="text-xs font-semibold text-brand-primary">Ver detalhes →</span>
            </div>
          </div>

          <EmptyState
            title="Tudo em harmonia"
            description="Apenas 2 pedidos aguardando seu carinho hoje. Cada peça embalada leva sua delicadeza e dedicação."
          />
        </section>

        <section className="lg:col-span-7 bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-brand-border">
              <div>
                <h2 className="font-editorial text-xl font-bold text-brand-plum">
                  Resumo da Seleção • #1042
                </h2>
                <p className="text-xs text-brand-muted">
                  Conferência com inventário ativo em tempo real
                </p>
              </div>
              <Badge variant="blush">Aguardando Confirmação</Badge>
            </div>

            <Input
              label="Buscar cliente ou número do pedido"
              rightLabel="Filtro Rápido"
              placeholder="Ex.: Mariana Silva ou #1042"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="space-y-3">
              <div className="bg-brand-soft rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-text-primary">Sutiã Renda Noir</p>
                  <p className="text-xs text-brand-muted">Tam: P • Cor: Preto Nobre • 1 un.</p>
                </div>
                <span className="text-sm font-bold text-brand-primary">R$ 119,90</span>
              </div>
              <div className="bg-brand-soft rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-text-primary">Conjunto Microfibra Nude</p>
                  <p className="text-xs text-brand-muted">Tam: M • Cor: Nude Essência • 1 un.</p>
                </div>
                <span className="text-sm font-bold text-brand-primary">R$ 149,90</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-brand-muted block">Total a Receber</span>
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

      {/* Modal de Confirmação de Pedido & Baixa no Estoque */}
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
            <span className="font-semibold text-text-primary">Conjunto Microfibra Nude (M)</span>
            <Badge variant="outOfStock">3 un. → 2 un. (-1 un.)</Badge>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Rotas Públicas da Loja com StoreLayout */}
      <Route element={<StoreLayout />}>
        {STORE_ROUTE_DESCRIPTORS.map((descriptor) => (
          <Route
            key={descriptor.path}
            path={descriptor.path}
            element={<StoreRoutePlaceholder descriptor={descriptor} />}
          />
        ))}
      </Route>

      {/* Rota base do Painel redireciona para Gestão de Pedidos */}
      <Route path={ROUTES.admin.root} element={<Navigate to={ROUTES.admin.orders} replace />} />

      {/* Rotas do Painel da Empresária (/painel/*) com AdminLayout */}
      <Route element={<AdminLayout />}>
        {ADMIN_ROUTE_DESCRIPTORS.map((descriptor) => (
          <Route
            key={descriptor.path}
            path={descriptor.path}
            element={<AdminRoutePlaceholder descriptor={descriptor} />}
          />
        ))}
      </Route>

      {/* Fallback para rotas não encontradas */}
      <Route path="*" element={<Navigate to={ROUTES.store.home} replace />} />
    </Routes>
  );
}
