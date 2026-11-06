import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
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
    <div className="min-h-screen bg-brand-bg text-text-primary flex flex-col">
      <header className="bg-brand-surface border-b border-brand-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <Link
            to={ROUTES.store.home}
            className="touch-target inline-flex flex-col justify-center no-underline"
          >
            <span className="font-editorial text-2xl font-bold tracking-tight text-brand-plum">
              MM <span className="text-brand-primary">Menina Mulher</span>
            </span>
            <span className="text-xs uppercase tracking-widest text-brand-muted">
              MVP Menina Mulher
            </span>
          </Link>

          <nav aria-label="Navegação da Loja" className="flex flex-wrap items-center gap-2">
            <Link to={ROUTES.store.home} className="btn btn-secondary text-sm">
              Início
            </Link>
            <Link to={ROUTES.store.catalog} className="btn btn-secondary text-sm">
              Catálogo
            </Link>
            <Link to={ROUTES.store.favorites} className="btn btn-secondary text-sm">
              Favoritos
            </Link>
            <Link to={ROUTES.store.bag} className="btn btn-primary text-sm">
              Sacola
            </Link>
            <Link to={ROUTES.store.sizeGuide} className="btn btn-secondary text-sm">
              Guia de Medidas
            </Link>
            <Link to={ROUTES.admin.orders} className="btn btn-secondary text-sm">
              Painel da Empresária
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <section className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-blush text-brand-plum">
              Loja Pública • Rota: {location.pathname}
            </span>
            {location.pathname === ROUTES.store.home && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-status-success-bg text-status-success">
                {isConnected ? "Conectado" : "Verificando API"}
              </span>
            )}
          </div>

          <h1 className="font-editorial text-3xl font-bold text-brand-plum mb-2">
            {descriptor.title}
          </h1>
          <p className="text-text-secondary mb-4">{descriptor.subtitle}</p>

          {(params.slug || params.id) && (
            <p className="text-sm font-medium text-brand-primary">
              Parâmetro selecionado: {params.slug ?? params.id}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function AdminRoutePlaceholder({ descriptor }: { descriptor: RouteDescriptor }) {
  const params = useParams();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-brand-bg text-text-primary flex flex-col">
      <header className="bg-brand-surface border-b border-brand-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-primary">
              Menina Mulher • Painel de Gestão Exclusiva
            </span>
            <p className="font-editorial text-xl font-bold text-brand-plum">Painel da Empresária</p>
          </div>

          <nav aria-label="Navegação do Painel" className="flex flex-wrap items-center gap-2">
            <Link to={ROUTES.admin.orders} className="btn btn-primary text-sm">
              Pedidos
            </Link>
            <Link to={ROUTES.admin.products} className="btn btn-secondary text-sm">
              Produtos
            </Link>
            <Link to={ROUTES.admin.stock} className="btn btn-secondary text-sm">
              Estoque
            </Link>
            <Link to={ROUTES.admin.login} className="btn btn-secondary text-sm">
              Login
            </Link>
            <Link to={ROUTES.store.home} className="btn btn-secondary text-sm">
              Ver Loja
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <section className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-blush text-brand-plum mb-3">
            Área Administrativa • Rota: {location.pathname}
          </span>
          <h1 className="font-editorial text-3xl font-bold text-brand-plum mb-2">
            {descriptor.title}
          </h1>
          <p className="text-text-secondary">{descriptor.subtitle}</p>
          {params.id && (
            <p className="mt-3 text-sm font-medium text-brand-primary">
              ID do produto: {params.id}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Rotas Públicas da Loja */}
      {STORE_ROUTE_DESCRIPTORS.map((descriptor) => (
        <Route
          key={descriptor.path}
          path={descriptor.path}
          element={<StoreRoutePlaceholder descriptor={descriptor} />}
        />
      ))}

      {/* Rota base do Painel redireciona para Gestão de Pedidos */}
      <Route path={ROUTES.admin.root} element={<Navigate to={ROUTES.admin.orders} replace />} />

      {/* Rotas do Painel da Empresária (/painel/*) */}
      {ADMIN_ROUTE_DESCRIPTORS.map((descriptor) => (
        <Route
          key={descriptor.path}
          path={descriptor.path}
          element={<AdminRoutePlaceholder descriptor={descriptor} />}
        />
      ))}

      {/* Fallback para rotas não encontradas */}
      <Route path="*" element={<Navigate to={ROUTES.store.home} replace />} />
    </Routes>
  );
}
