import {
  Grid,
  Heart,
  Home,
  Menu,
  MessageCircle,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "../../routes/routes.config";

export interface StoreLayoutProps {
  children?: ReactNode;
  bagCount?: number;
  favoritesCount?: number;
}

const DESKTOP_CATEGORIES = [
  { label: "Home", path: ROUTES.store.home },
  { label: "Partes de cima", path: "/categoria/partes-de-cima" },
  { label: "Partes de baixo", path: "/categoria/partes-de-baixo" },
  { label: "Conjuntos", path: "/categoria/conjuntos" },
  { label: "Lançamentos", path: ROUTES.store.catalog },
];

const DRAWER_CATEGORIES = [
  { label: "Início", path: ROUTES.store.home, badge: null },
  { label: "Partes de Cima", path: "/categoria/partes-de-cima", badge: "42 peças" },
  { label: "Partes de Baixo", path: "/categoria/partes-de-baixo", badge: "36 peças" },
  { label: "Conjuntos", path: "/categoria/conjuntos", badge: "Novos" },
];

export function StoreLayout({ children, bagCount = 4, favoritesCount = 3 }: StoreLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();

  const isActivePath = (targetPath: string) => {
    if (targetPath === ROUTES.store.home) {
      return location.pathname === ROUTES.store.home;
    }
    return location.pathname.startsWith(targetPath);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-brand-bg text-text-primary flex flex-col">
      {/* Cabeçalho da Loja (Mobile-First + Desktop >= 1024px) */}
      <header className="sticky top-0 z-30 bg-brand-surface border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-3">
          {/* Botão Menu Gaveta (Mobile < 1024px) */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Abrir menu de navegação"
              aria-expanded={isDrawerOpen}
              className="touch-target inline-flex items-center justify-center rounded-xl text-brand-plum hover:bg-brand-soft transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Logo Menina Mulher */}
          <Link
            to={ROUTES.store.home}
            className="touch-target inline-flex flex-col items-center lg:items-start justify-center no-underline"
          >
            <span className="font-editorial text-xl lg:text-2xl font-bold tracking-tight text-brand-plum leading-none">
              MM <span className="text-brand-primary">Menina Mulher</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-muted mt-0.5">
              MVP Menina Mulher
            </span>
          </Link>

          {/* Navegação Horizontal Desktop (>= 1024px) */}
          <nav
            aria-label="Navegação principal da loja"
            className="hidden lg:flex items-center gap-1"
          >
            {DESKTOP_CATEGORIES.map((item) => {
              const active = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`touch-target inline-flex items-center px-3.5 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
                    active
                      ? "text-brand-primary font-semibold border-b-2 border-brand-primary rounded-b-none"
                      : "text-text-secondary hover:text-brand-plum hover:bg-brand-soft"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Ações à Direita: Busca, Favoritos e Sacola com Contador */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Barra de Busca Desktop */}
            <form
              role="search"
              aria-label="Buscar produtos na loja"
              onSubmit={(e) => e.preventDefault()}
              className="hidden lg:flex items-center bg-brand-soft border border-brand-border rounded-full px-3.5 min-h-[44px] w-64 focus-within:border-brand-primary"
            >
              <Search className="w-4 h-4 text-brand-muted shrink-0 mr-2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar peças..."
                aria-label="Buscar peças"
                className="bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-brand-muted w-full"
              />
            </form>

            {/* Botão Busca Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen((prev) => !prev)}
              aria-label="Alternar barra de busca"
              aria-expanded={isMobileSearchOpen}
              className="touch-target lg:hidden inline-flex items-center justify-center rounded-xl text-brand-plum hover:bg-brand-soft transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Atalho Favoritos */}
            <Link
              to={ROUTES.store.favorites}
              aria-label={`Favoritos (${favoritesCount} itens)`}
              className="touch-target relative inline-flex items-center justify-center rounded-xl text-brand-plum hover:bg-brand-soft transition-colors no-underline"
            >
              <Heart className="w-5 h-5" />
              {favoritesCount > 0 && (
                <span
                  data-testid="store-favorites-count"
                  className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-blush text-brand-plum text-[11px] font-bold inline-flex items-center justify-center"
                >
                  {favoritesCount}
                </span>
              )}
            </Link>

            {/* Atalho Sacola com Contador */}
            <Link
              to={ROUTES.store.bag}
              aria-label={`Sacola de compras (${bagCount} itens)`}
              className="touch-target relative inline-flex items-center justify-center rounded-xl text-brand-plum hover:bg-brand-soft transition-colors no-underline"
            >
              <ShoppingBag className="w-5 h-5" />
              <span
                data-testid="store-bag-count"
                className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-primary text-white text-[11px] font-bold inline-flex items-center justify-center"
              >
                {bagCount}
              </span>
            </Link>
          </div>
        </div>

        {/* Barra de Busca Expansível Mobile */}
        {isMobileSearchOpen && (
          <div className="lg:hidden px-4 pb-3 bg-brand-surface border-t border-brand-border">
            <form
              role="search"
              onSubmit={(e) => e.preventDefault()}
              className="flex items-center bg-brand-soft border border-brand-border rounded-xl px-3.5 min-h-[44px] mt-2"
            >
              <Search className="w-4 h-4 text-brand-muted shrink-0 mr-2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar sutiã, calcinha, conjunto..."
                aria-label="Buscar peças no catálogo mobile"
                className="bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-brand-muted w-full"
              />
            </form>
          </div>
        )}
      </header>

      {/* Menu Gaveta Mobile (C02 Menu Gaveta Mobile) */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação da loja"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsDrawerOpen(false)}
          />
          <aside className="relative z-10 w-[85%] max-w-xs bg-brand-surface h-full flex flex-col justify-between overflow-y-auto shadow-xl">
            <div>
              {/* Topo da Gaveta */}
              <div className="p-4 bg-brand-soft border-b border-brand-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-full bg-brand-blush text-brand-primary font-editorial font-bold inline-flex items-center justify-center text-base">
                      MM
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                        Menina Mulher
                      </p>
                      <p className="text-xs text-brand-muted">Lingerie & Sensualidade</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    aria-label="Fechar menu de navegação"
                    className="touch-target inline-flex items-center justify-center rounded-full bg-brand-surface text-brand-plum border border-brand-border"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-brand-surface rounded-xl p-3 border border-brand-border flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-brand-plum">Bem-vinda à Menina Mulher</p>
                    <p className="text-xs text-brand-muted">Realce o seu encanto todos os dias</p>
                  </div>
                </div>
              </div>

              {/* Links de Categorias da Gaveta */}
              <nav aria-label="Links do menu gaveta" className="p-4 flex flex-col gap-1">
                {DRAWER_CATEGORIES.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsDrawerOpen(false)}
                    className="touch-target flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-text-primary hover:bg-brand-soft no-underline border-b border-brand-border/60 last:border-b-0"
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-blush text-brand-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}

                <Link
                  to={ROUTES.store.favorites}
                  onClick={() => setIsDrawerOpen(false)}
                  className="touch-target flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-brand-primary hover:bg-brand-soft no-underline"
                >
                  <span className="inline-flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Favoritos
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-primary text-white">
                    {favoritesCount}
                  </span>
                </Link>

                <Link
                  to={ROUTES.store.sizeGuide}
                  onClick={() => setIsDrawerOpen(false)}
                  className="touch-target mt-2 flex items-center justify-between px-3.5 py-3 rounded-xl bg-brand-soft text-text-primary hover:bg-brand-blush/50 no-underline"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Ruler className="w-4 h-4 text-brand-plum" />
                    <span>
                      <strong className="block text-sm text-brand-plum">Guia de Medidas</strong>
                      <span className="block text-xs text-brand-muted">Acerte o tamanho ideal</span>
                    </span>
                  </span>
                </Link>
              </nav>
            </div>

            {/* Rodapé da Gaveta */}
            <div className="p-4 bg-brand-soft border-t border-brand-border flex flex-col gap-3">
              <a
                href="https://wa.me/5511987654321"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary w-full text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Fale com a dona da loja
              </a>
              <div className="bg-brand-surface rounded-xl p-3 border border-brand-border text-xs text-brand-muted">
                <p className="font-bold text-text-primary mb-0.5">Atendimento Humanizado</p>
                <p>Segunda a Sábado, das 09h às 19h</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Conteúdo Principal da Rota */}
      <main className="flex-1 w-full pb-20 lg:pb-0">{children ?? <Outlet />}</main>

      {/* Rodapé da Loja (StoreFooter) */}
      <footer
        aria-label="Rodapé da loja"
        className="bg-brand-soft border-t border-brand-border text-text-secondary pb-20 lg:pb-0"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Coluna 1: Identidade */}
          <div>
            <p className="font-editorial text-xl font-bold text-brand-plum mb-2">
              MM <span className="text-brand-primary">Menina Mulher</span>
            </p>
            <p className="text-xs leading-relaxed text-brand-muted mb-3">
              Celebrando a sensualidade delicada e o empoderamento feminino com lingeries
              confeccionadas em rendas finas, microfibra e algodão que abraçam todas as curvas.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
              • Boutique Exclusiva
            </span>
          </div>

          {/* Coluna 2: Coleções */}
          <div>
            <h2 className="font-editorial text-sm font-bold text-brand-plum uppercase tracking-wider mb-3">
              Coleções
            </h2>
            <ul className="space-y-1 text-xs list-none p-0 m-0">
              <li>
                <Link
                  to="/categoria/partes-de-cima"
                  className="touch-target inline-flex items-center text-brand-muted hover:text-brand-primary no-underline"
                >
                  Sutiãs & Tops Estruturados
                </Link>
              </li>
              <li>
                <Link
                  to="/categoria/partes-de-baixo"
                  className="touch-target inline-flex items-center text-brand-muted hover:text-brand-primary no-underline"
                >
                  Calcinhas em Renda & Algodão
                </Link>
              </li>
              <li>
                <Link
                  to="/categoria/conjuntos"
                  className="touch-target inline-flex items-center text-brand-muted hover:text-brand-primary no-underline"
                >
                  Conjuntos Sensuais & Românticos
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.store.catalog}
                  className="touch-target inline-flex items-center text-brand-muted hover:text-brand-primary no-underline"
                >
                  Lançamentos da Estação
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Atendimento & Contato */}
          <div>
            <h2 className="font-editorial text-sm font-bold text-brand-plum uppercase tracking-wider mb-3">
              Atendimento & Contato
            </h2>
            <ul className="space-y-2 text-xs text-brand-muted list-none p-0 m-0">
              <li>
                <strong className="text-text-primary">WhatsApp:</strong> (11) 98765-4321
              </li>
              <li>contato@meninamulher.com.br</li>
              <li>Seg a Sex: 09h às 19h | Sáb: 10h às 16h</li>
              <li>Retiradas e atendimento com hora marcada</li>
            </ul>
          </div>

          {/* Coluna 4: Ajuda & Segurança */}
          <div>
            <h2 className="font-editorial text-sm font-bold text-brand-plum uppercase tracking-wider mb-3">
              Ajuda & Segurança
            </h2>
            <ul className="space-y-1 text-xs list-none p-0 m-0">
              <li>
                <Link
                  to={ROUTES.store.sizeGuide}
                  className="touch-target inline-flex items-center text-brand-muted hover:text-brand-primary no-underline"
                >
                  Guia de Medidas & Tamanhos
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.store.bag}
                  className="touch-target inline-flex items-center text-brand-muted hover:text-brand-primary no-underline"
                >
                  Sacola e Pedido pelo WhatsApp
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.admin.orders}
                  className="touch-target inline-flex items-center text-brand-muted hover:text-brand-primary no-underline"
                >
                  Painel da Empresária
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-brand-border py-4 px-4 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-brand-muted">
            <p>© 2026 Menina Mulher Lingerie. Feito com delicadeza e amor próprio.</p>
            <span className="inline-flex items-center gap-1.5 font-medium text-brand-plum">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              Compra 100% Protegida via WhatsApp
            </span>
          </div>
        </div>
      </footer>

      {/* Navegação Inferior Mobile da Loja (< 1024px) */}
      <nav
        aria-label="Navegação inferior mobile da loja"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-brand-surface border-t border-brand-border px-4 py-1 flex items-center justify-around"
      >
        <Link
          to={ROUTES.store.home}
          aria-current={location.pathname === ROUTES.store.home ? "page" : undefined}
          className={`touch-target flex flex-col items-center justify-center px-3 py-1 text-xs font-semibold no-underline ${
            location.pathname === ROUTES.store.home ? "text-brand-primary" : "text-brand-muted"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Início</span>
        </Link>
        <Link
          to={ROUTES.store.catalog}
          aria-current={
            location.pathname.startsWith(ROUTES.store.catalog) ||
            location.pathname.startsWith("/categoria")
              ? "page"
              : undefined
          }
          className={`touch-target flex flex-col items-center justify-center px-3 py-1 text-xs font-semibold no-underline ${
            location.pathname.startsWith(ROUTES.store.catalog) ||
            location.pathname.startsWith("/categoria")
              ? "text-brand-primary"
              : "text-brand-muted"
          }`}
        >
          <Grid className="w-5 h-5" />
          <span>Coleções</span>
        </Link>
        <Link
          to={ROUTES.store.profile}
          aria-current={location.pathname === ROUTES.store.profile ? "page" : undefined}
          className={`touch-target flex flex-col items-center justify-center px-3 py-1 text-xs font-semibold no-underline ${
            location.pathname === ROUTES.store.profile ? "text-brand-primary" : "text-brand-muted"
          }`}
        >
          <User className="w-5 h-5" />
          <span>Perfil</span>
        </Link>
      </nav>
    </div>
  );
}
