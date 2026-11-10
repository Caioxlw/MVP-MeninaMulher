import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Input } from "../../components/ui";
import { ROUTES, type RouteDescriptor } from "../../routes/routes.config";
import {
  type Category,
  DEMO_CATEGORIES,
  ProductsApiError,
  createProduct,
  getAdminProductById,
  getCategories,
  parsePriceInput,
  updateProduct,
} from "../../services/productsApi";
import type { AdminProductsLocationState } from "./AdminProductsScreen";

function formatInitialPrice(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

export function AdminProductFormScreen({ descriptor }: { descriptor: RouteDescriptor }) {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();

  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [categoryId, setCategoryId] = useState<string>(DEMO_CATEGORIES[0]?.id ?? "");
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    price?: string;
    categoryId?: string;
  }>({});

  useEffect(() => {
    let mounted = true;

    const loadCategoriesPromise = getCategories();
    const loadProductPromise = id ? getAdminProductById(id) : Promise.resolve(null);

    Promise.all([loadCategoriesPromise, loadProductPromise])
      .then(([catResult, productResult]) => {
        if (!mounted) return;
        setCategories(catResult.data);
        setIsDemoMode(catResult.demo || Boolean(productResult?.demo));

        if (productResult) {
          const p = productResult.data;
          setName(p.name);
          setDescription(p.description ?? "");
          setPriceInput(formatInitialPrice(p.price));
          setCategoryId(p.categoryId ?? catResult.data[0]?.id ?? "");
          setActive(p.active);
          setFeatured(p.featured);
        } else if (catResult.data.length > 0) {
          setCategoryId((prev) => prev || catResult.data[0].id);
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        if (err instanceof ProductsApiError && err.code === "UNAUTHORIZED") {
          navigate(ROUTES.admin.login, {
            replace: true,
            state: { from: location.pathname },
          });
          return;
        }
        setFormError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os dados para o formulário."
        );
      })
      .finally(() => {
        if (mounted) setIsLoadingData(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, location.pathname, navigate]);

  const validateFields = (): {
    valid: boolean;
    trimmedName: string;
    parsedPrice: number;
  } => {
    const nextErrors: { name?: string; price?: string; categoryId?: string } = {};
    const trimmedName = name.trim();
    const parsedPrice = parsePriceInput(priceInput);

    if (!trimmedName) {
      nextErrors.name = "O nome do produto é obrigatório.";
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      nextErrors.price = "Informe um preço válido maior ou igual a zero (ex.: 119,90).";
    }
    if (!categoryId.trim()) {
      nextErrors.categoryId = "Selecione uma categoria para o produto.";
    }

    setFieldErrors(nextErrors);
    return {
      valid: Object.keys(nextErrors).length === 0,
      trimmedName,
      parsedPrice,
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const { valid, trimmedName, parsedPrice } = validateFields();
    if (!valid) {
      setFormError("Corrija os campos destacados antes de salvar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        description: description.trim() ? description.trim() : null,
        price: parsedPrice,
        categoryId,
        active,
        featured,
      };

      const saved =
        isEditMode && id ? await updateProduct(id, payload) : await createProduct(payload);

      const flashMessage = isEditMode
        ? `Produto "${saved.name}" atualizado com sucesso!`
        : `Produto "${saved.name}" cadastrado com sucesso!`;

      navigate(ROUTES.admin.products, {
        state: { flashMessage } satisfies AdminProductsLocationState,
      });
    } catch (err: unknown) {
      if (err instanceof ProductsApiError && err.code === "UNAUTHORIZED") {
        navigate(ROUTES.admin.login, {
          replace: true,
          state: { from: location.pathname },
        });
        return;
      }
      setFormError(
        err instanceof Error ? err.message : "Não foi possível salvar os dados do produto."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {isDemoMode && (
        <Alert variant="warning" title="Modo Demonstração — API offline">
          Os dados exibidos são do catálogo de demonstração. Conecte o servidor backend para salvar
          alterações.
        </Alert>
      )}

      {formError && (
        <Alert
          variant="error"
          title="Não foi possível salvar o produto"
          onClose={() => setFormError(null)}
        >
          {formError}
        </Alert>
      )}

      <section className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant="blush">{isEditMode ? "EDIÇÃO DE PEÇA" : "CADASTRO DE PEÇA"}</Badge>
            <span className="text-xs text-brand-muted">Rota: {location.pathname}</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-plum">
            {descriptor.title}
          </h1>
          <p className="text-sm text-text-secondary">{descriptor.subtitle}</p>
          {isEditMode && id && (
            <p className="mt-1 text-xs font-semibold text-brand-primary">
              Editando produto ID: {id}
            </p>
          )}
        </div>

        <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.admin.products)}>
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Catálogo
        </Button>
      </section>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
        className="bg-brand-surface border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5"
      >
        {isLoadingData && (
          <p className="text-xs text-brand-muted">Carregando informações da peça...</p>
        )}

        <Input
          label="Nome da Peça"
          placeholder="Ex.: Sutiã Renda Noir"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Preço de Venda (R$)"
            placeholder="Ex.: 119,90"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            error={fieldErrors.price}
            helperText="Use vírgula ou ponto para os centavos."
            required
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="product-category-select"
              className="text-xs font-semibold tracking-wide text-text-primary"
            >
              Categoria da Peça
            </label>
            <select
              id="product-category-select"
              aria-label="Categoria da Peça"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <p role="alert" className="text-xs font-medium text-status-danger">
                {fieldErrors.categoryId}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="product-description-textarea"
            className="text-xs font-semibold tracking-wide text-text-primary"
          >
            Descrição e Detalhes do Tecido
          </label>
          <textarea
            id="product-description-textarea"
            rows={3}
            placeholder="Descreva o caimento, composição da renda, microfibra ou algodão..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface text-sm text-text-primary placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        {/* Opções de Visibilidade e Destaque (alvos de toque >= 44px — RNF07) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-brand-border">
          <label className="min-h-11 p-3.5 rounded-xl border border-brand-border bg-brand-soft/60 flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-brand-plum flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                Visível na Vitrine (Ativo)
              </span>
              <span className="text-[11px] text-brand-muted block">
                Quando desmarcado, o produto fica oculto para as clientes.
              </span>
            </div>
            <input
              type="checkbox"
              aria-label="Visível na Vitrine (Ativo)"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-5 h-5 accent-brand-primary cursor-pointer"
            />
          </label>

          <label className="min-h-11 p-3.5 rounded-xl border border-brand-border bg-brand-soft/60 flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-brand-plum flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-primary" />
                Destacar na Página Inicial
              </span>
              <span className="text-[11px] text-brand-muted block">
                Exibe o selo de Destaque na vitrine principal da loja.
              </span>
            </div>
            <input
              type="checkbox"
              aria-label="Destacar na Página Inicial"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-5 h-5 accent-brand-primary cursor-pointer"
            />
          </label>
        </div>

        <div className="pt-4 border-t border-brand-border flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.admin.products)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditMode ? "Salvar Alterações" : "Cadastrar Produto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
