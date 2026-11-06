import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AdminLayout } from "../components/layout/AdminLayout";
import { StoreLayout } from "../components/layout/StoreLayout";
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

const PREVIEW_PRODUCTS = [
  {
    id: "sutia-renda-noir",
    category: "Partes de Cima",
    name: "Sutiã Renda Noir",
    subtitle: "Toque aveludado e suave",
    price: "R$ 119,90",
    installment: "3x s/ juros",
    sizes: "Tam: P, M, G",
    badge: "Destaque",
    available: true,
  },
  {
    id: "calcinha-algodao-doce",
    category: "Partes de Baixo",
    name: "Calcinha Algodão Doce",
    subtitle: "Respirável e diária",
    price: "R$ 39,90",
    installment: "À vista",
    sizes: "Tam: M, G",
    badge: "100% Algodão",
    available: true,
  },
  {
    id: "conjunto-microfibra-nude",
    category: "Conjuntos",
    name: "Conjunto Microfibra",
    subtitle: "Tecido toque de seda",
    price: "R$ 149,90",
    installment: "4x s/ juros",
    sizes: "Tam: P, M, G",
    badge: "Últimas unidades",
    available: true,
  },
  {
    id: "body-renda-floral",
    category: "Partes de Cima",
    name: "Body Renda",
    subtitle: "Decote costas cavadas",
    price: "R$ 99,90",
    installment: "Consulte reposição",
    sizes: "Tam: P, M",
    badge: "Esgotado",
    available: false,
  },
];

function StoreRoutePlaceholder({ descriptor }: { descriptor: RouteDescriptor }) {
  const params = useParams();
  const location = useLocation();
  const [health, setHealth] = useState<HealthResponse | null>(null);

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

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-8 lg:space-y-12">
      {/* Banner / Hero Responsivo: 1 coluna no Mobile, 2 colunas (7 + 5) no Desktop */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-8 lg:p-10 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-blush text-brand-plum">
                Loja Pública • Rota: {location.pathname}
              </span>
              {location.pathname === ROUTES.store.home && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-status-success-bg text-status-success">
                  {isConnected ? "Conectado" : "Verificando API"}
                </span>
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
              <Link to={ROUTES.store.catalog} className="btn btn-primary text-sm">
                Ver Catálogo Completo
              </Link>
              <Link to={ROUTES.store.sizeGuide} className="btn btn-secondary text-sm">
                Guia de Medidas
              </Link>
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
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-blush text-brand-primary mb-3">
                  Sensualidade & Cuidado
                </span>
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
                <span className="px-2.5 py-1 rounded-full bg-brand-surface text-brand-primary font-bold">
                  100% Brasil
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grade Responsiva do Catálogo: 2 colunas no Mobile (360px), 3 no Tablet, 4 no Desktop */}
      <section aria-label="Prévia da grade responsiva da loja" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary block">
              Catálogo Selecionado
            </span>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-brand-plum">
              Explore Nossas Peças
            </h2>
          </div>
          <p className="text-xs text-brand-muted">
            Grade responsiva: 2 colunas no celular • 4 colunas no computador
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {PREVIEW_PRODUCTS.map((product) => (
            <article
              key={product.id}
              className="bg-brand-surface border border-brand-border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="aspect-3/4 rounded-xl bg-brand-soft border border-brand-border p-2.5 flex flex-col justify-between mb-3">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        product.available
                          ? "bg-brand-primary text-white"
                          : "bg-brand-border text-brand-muted"
                      }`}
                    >
                      {product.badge}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-brand-muted">{product.sizes}</span>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                  {product.category}
                </p>
                <h3 className="font-editorial text-sm sm:text-base font-bold text-brand-plum leading-snug">
                  {product.name}
                </h3>
                <p className="text-xs text-text-secondary mb-2">{product.subtitle}</p>
              </div>

              <div className="pt-2 border-t border-brand-border space-y-2">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-sm sm:text-base font-bold text-brand-primary">
                    {product.price}
                  </span>
                  <span className="text-[10px] text-brand-muted">{product.installment}</span>
                </div>
                <Link
                  to={`/produto/${product.id}`}
                  className={`btn w-full text-xs ${
                    product.available ? "btn-primary" : "btn-secondary opacity-70"
                  }`}
                >
                  {product.available ? "Comprar Agora" : "Indisponível"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminRoutePlaceholder({ descriptor }: { descriptor: RouteDescriptor }) {
  const params = useParams();
  const location = useLocation();

  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Cabeçalho da Página do Painel */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-blush text-brand-plum mb-2">
              Área Administrativa • Rota: {location.pathname}
            </span>
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
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-brand-primary text-white">
              2 Pendentes
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-soft text-brand-plum border border-brand-border">
              14 Confirmados
            </span>
          </div>
        </div>
      </section>

      {/* Visão Master-Detail Responsiva: 1 coluna empilhada no Celular, 12 colunas (5 + 7) no Computador */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 space-y-3">
          <div className="bg-brand-surface border-2 border-brand-primary rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-editorial text-base font-bold text-brand-plum">
                Pedido #1042
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-blush text-brand-primary">
                Pendente
              </span>
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
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-status-danger-bg text-status-danger">
                Atenção Estoque
              </span>
            </div>
            <p className="text-sm font-semibold text-text-primary">Camila Rocha</p>
            <p className="text-xs text-brand-muted mb-3">Recebido via WhatsApp • 2 peças</p>
            <div className="pt-2 border-t border-brand-border flex items-center justify-between">
              <span className="text-base font-bold text-brand-primary">R$ 79,80</span>
              <span className="text-xs font-semibold text-brand-primary">Ver detalhes →</span>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-brand-border mb-4">
              <div>
                <h2 className="font-editorial text-xl font-bold text-brand-plum">
                  Resumo da Seleção • #1042
                </h2>
                <p className="text-xs text-brand-muted">
                  Conferência com inventário ativo em tempo real
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-blush text-brand-primary">
                Aguardando Confirmação
              </span>
            </div>

            <div className="space-y-3 mb-6">
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
              <button type="button" className="btn btn-secondary text-xs">
                Cancelar Pedido
              </button>
              <button type="button" className="btn btn-primary text-xs">
                Confirmar Pedido & Baixar Estoque
              </button>
            </div>
          </div>
        </section>
      </div>
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
