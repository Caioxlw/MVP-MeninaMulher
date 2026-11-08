import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Alert, Badge, Button, Input } from "../../components/ui";
import { ROUTES, type RouteDescriptor } from "../../routes/routes.config";
import { isAdminAuthenticated, loginAdmin } from "../../services/authApi";

interface LocationRedirectState {
  from?: string;
}

/**
 * Guardião de rotas privadas do painel administrativo (/painel/* — RF11, RNF05, PBI #99).
 * Bloqueia o acesso às telas internas quando a empresária não está autenticada.
 */
export function ProtectedAdminRoute() {
  const location = useLocation();

  if (!isAdminAuthenticated()) {
    return (
      <Navigate
        to={ROUTES.admin.login}
        state={{ from: location.pathname } satisfies LocationRedirectState}
        replace
      />
    );
  }

  return <AdminLayout />;
}

/**
 * Tela de Login da Empresária (/painel/login — RF11, RNF01, RNF04, RNF05, RNF07, PBI #99).
 */
export function AdminLoginScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectState = (location.state as LocationRedirectState | null) ?? null;
  const destination =
    redirectState?.from && redirectState.from !== ROUTES.admin.login
      ? redirectState.from
      : ROUTES.admin.orders;

  const [email, setEmail] = useState("proprietaria@meninamulher.com.br");
  const [password, setPassword] = useState("MeninaMulher@2026");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await loginAdmin({ email, password });
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível autenticar. Verifique suas credenciais."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-text-primary flex flex-col justify-between">
      {/* Cabeçalho Institucional do Painel */}
      <header className="bg-brand-surface border-b border-brand-border px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-editorial text-xl font-bold text-brand-primary leading-tight">
              Boutique Menina Mulher
            </p>
            <span className="text-xs text-brand-muted">
              Menina Mulher • Painel de Gestão Exclusiva
            </span>
          </div>
          <Badge variant="blush">Ambiente Administrativo Seguro</Badge>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-xs">
          {/* Coluna Editorial Esquerda */}
          <div className="md:col-span-5 bg-brand-soft p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-brand-border space-y-6">
            <div>
              <Badge variant="blush" className="mb-3">
                ACESSO RESTRITO • RF11
              </Badge>
              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum mb-2">
                {descriptor.title}
              </h1>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                {descriptor.subtitle}
              </p>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-brand-border/70">
              <div className="text-xs text-brand-plum font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0" />
                Proteção de rotas privadas ativa (RNF05)
              </div>
              <div className="text-xs text-brand-muted flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-primary shrink-0" />
                Sessão criptografada via token JWT
              </div>
            </div>
          </div>

          {/* Formulário de Autenticação à Direita */}
          <form onSubmit={handleSubmit} noValidate className="md:col-span-7 p-6 md:p-8 space-y-4">
            {redirectState?.from && (
              <Alert variant="warning" title="Autenticação necessária">
                Faça login com sua conta de empresária para acessar{" "}
                <strong>{redirectState.from}</strong>.
              </Alert>
            )}

            {errorMessage && (
              <Alert
                variant="error"
                title="Falha na Autenticação"
                onClose={() => setErrorMessage(null)}
              >
                {errorMessage}
              </Alert>
            )}

            <Input
              label="E-mail da Empresária"
              type="email"
              autoComplete="email"
              placeholder="proprietaria@meninamulher.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="space-y-1.5">
              <Input
                label="Senha de Acesso"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightLabel="Uso exclusivo da loja"
                leftIcon={<Lock className="w-4 h-4" />}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="min-h-11 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-plum hover:bg-brand-soft inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-brand-primary" />
                      Ocultar senha
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-brand-primary" />
                      Mostrar senha
                    </>
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={isLoading}>
              Entrar no Painel
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
