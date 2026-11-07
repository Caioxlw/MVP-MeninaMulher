import { Archive, LogOut, Package, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "../../routes/routes.config";

export interface AdminLayoutProps {
  children?: ReactNode;
  pendingOrdersCount?: number;
}

interface AdminNavSection {
  key: "orders" | "products" | "stock";
  label: string;
  path: string;
  matchPrefix: string;
  icon: typeof ShoppingBag;
  badge?: number;
}

export function AdminLayout({ children, pendingOrdersCount = 2 }: AdminLayoutProps) {
  const location = useLocation();

  const sections: AdminNavSection[] = [
    {
      key: "orders",
      label: "Pedidos",
      path: ROUTES.admin.orders,
      matchPrefix: "/painel/pedidos",
      icon: ShoppingBag,
      badge: pendingOrdersCount,
    },
    {
      key: "products",
      label: "Produtos",
      path: ROUTES.admin.products,
      matchPrefix: "/painel/produtos",
      icon: Package,
    },
    {
      key: "stock",
      label: "Estoque",
      path: ROUTES.admin.stock,
      matchPrefix: "/painel/estoque",
      icon: Archive,
    },
  ];

  const isSectionActive = (section: AdminNavSection) =>
    location.pathname.startsWith(section.matchPrefix);

  const activeSection = sections.find((section) => isSectionActive(section)) ?? sections[0];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-brand-bg text-text-primary flex">
      {/* Menu Lateral no Computador (>= 1024px) */}
      <aside
        aria-label="Menu lateral do painel administrativo"
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-brand-soft border-r border-brand-border justify-between"
      >
        <div>
          {/* Logo na Sidebar */}
          <div className="h-20 px-6 flex flex-col justify-center border-b border-brand-border">
            <Link to={ROUTES.admin.orders} className="no-underline">
              <span className="font-editorial text-xl font-bold text-brand-primary block leading-tight">
                Menina Mulher
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-muted block">
                Lingerie Boutique
              </span>
            </Link>
          </div>

          {/* Links da Sidebar */}
          <nav aria-label="Navegação lateral do painel" className="p-4 space-y-1.5">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = isSectionActive(section);
              return (
                <Link
                  key={section.key}
                  to={section.path}
                  aria-current={active ? "page" : undefined}
                  data-testid={`admin-sidebar-link-${section.key}`}
                  className={`touch-target flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold no-underline transition-colors ${
                    active
                      ? "bg-brand-primary text-white shadow-xs"
                      : "text-text-secondary hover:bg-brand-surface hover:text-brand-plum"
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{section.label}</span>
                  </span>
                  {typeof section.badge === "number" && section.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        active ? "bg-white text-brand-primary" : "bg-brand-primary text-white"
                      }`}
                    >
                      {section.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar: Sair do Painel */}
        <div className="p-4 border-t border-brand-border">
          <Link
            to={ROUTES.admin.login}
            className="touch-target flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-brand-surface hover:text-brand-primary no-underline transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Painel</span>
          </Link>
        </div>
      </aside>

      {/* Coluna Principal (Cabeçalho + Conteúdo + Navegação Inferior Mobile) */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Cabeçalho Superior do Painel */}
        <header className="sticky top-0 z-20 bg-brand-surface border-b border-brand-border px-4 lg:px-8 py-3 lg:h-20 flex items-center justify-between gap-3">
          {/* Identificação Mobile (< 1024px) */}
          <div className="lg:hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary block">
              Menina Mulher
            </span>
            <p className="font-editorial text-2xl font-bold text-brand-plum leading-tight">
              {activeSection.label}
            </p>
          </div>

          {/* Identificação Desktop (>= 1024px) */}
          <div className="hidden lg:flex items-center gap-4">
            <div>
              <p className="text-sm font-bold text-text-primary leading-tight">
                Boutique Menina Mulher
              </p>
              <span className="text-xs text-brand-muted">
                Menina Mulher • Painel de Gestão Exclusiva
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-blush text-brand-plum">
              <span className="w-2 h-2 rounded-full bg-status-success" />
              Boutique Aberta
            </span>
          </div>

          {/* Avatar / Selo MM à Direita */}
          <div className="flex items-center gap-3">
            <span className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-blush text-brand-plum">
              <span className="w-2 h-2 rounded-full bg-brand-primary" />
              Boutique Aberta
            </span>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-full bg-brand-blush text-brand-plum font-editorial font-bold inline-flex items-center justify-center text-sm">
                MM
              </span>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-text-primary leading-tight">Proprietária MM</p>
                <p className="text-[11px] text-brand-muted">Empresária & Vendedora</p>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal do Painel */}
        <main className="flex-1 w-full pb-24 lg:pb-8">{children ?? <Outlet />}</main>

        {/* Navegação Inferior no Celular (< 1024px) */}
        <nav
          aria-label="Navegação inferior do painel mobile"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-brand-surface border-t border-brand-border px-2 py-1 flex items-center justify-around"
        >
          {sections.map((section) => {
            const Icon = section.icon;
            const active = isSectionActive(section);
            return (
              <Link
                key={section.key}
                to={section.path}
                aria-current={active ? "page" : undefined}
                data-testid={`admin-bottom-link-${section.key}`}
                className={`touch-target relative flex flex-col items-center justify-center px-4 py-1.5 rounded-xl text-xs no-underline transition-colors ${
                  active
                    ? "text-brand-primary font-bold"
                    : "text-brand-muted font-medium hover:text-brand-plum"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {typeof section.badge === "number" && section.badge > 0 && (
                    <span
                      data-testid={`admin-bottom-badge-${section.key}`}
                      className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-primary text-white text-[10px] font-bold inline-flex items-center justify-center"
                    >
                      {section.badge}
                    </span>
                  )}
                </div>
                <span className="mt-0.5">{section.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
