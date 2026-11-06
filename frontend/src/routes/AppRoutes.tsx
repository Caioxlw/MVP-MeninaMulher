import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
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
    <div className="max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
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
    </div>
  );
}

function AdminRoutePlaceholder({ descriptor }: { descriptor: RouteDescriptor }) {
  const params = useParams();
  const location = useLocation();

  return (
    <div className="max-w-6xl w-full mx-auto px-4 lg:px-8 py-6">
      <section className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-blush text-brand-plum mb-3">
          Área Administrativa • Rota: {location.pathname}
        </span>
        <h1 className="font-editorial text-3xl font-bold text-brand-plum mb-2">
          {descriptor.title}
        </h1>
        <p className="text-text-secondary">{descriptor.subtitle}</p>
        {params.id && (
          <p className="mt-3 text-sm font-medium text-brand-primary">ID do produto: {params.id}</p>
        )}
      </section>
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
