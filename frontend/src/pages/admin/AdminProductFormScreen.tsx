import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Link2,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Input } from "../../components/ui";
import { ROUTES, type RouteDescriptor } from "../../routes/routes.config";
import {
  type Category,
  DEMO_CATEGORIES,
  type Product,
  type ProductImageSummary,
  ProductsApiError,
  addProductImageByUrl,
  applyDemoAddProductImage,
  applyDemoCreateProduct,
  applyDemoDeleteProductImage,
  applyDemoUpdateProduct,
  applyDemoUpdateProductImage,
  createProduct,
  deleteProductImage,
  getAdminProductById,
  getCategories,
  parsePriceInput,
  updateProduct,
  updateProductImage,
  uploadProductImageFile,
  validateProductImageFile,
} from "../../services/productsApi";
import type { AdminProductsLocationState } from "./AdminProductsScreen";

interface FormImageItem extends ProductImageSummary {
  pendingFile?: File;
}

function formatInitialPrice(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

function createLocalPreviewUrl(file: File): string {
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    try {
      return URL.createObjectURL(file);
    } catch {
      // Fallback para ambientes de teste (JSDOM)
    }
  }
  return `https://local.meninamulher.test/uploads/${encodeURIComponent(file.name)}`;
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

  // Estado da Galeria de Fotos da Peça (PBI #17)
  const [images, setImages] = useState<FormImageItem[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageAltInput, setImageAltInput] = useState("");
  const [imageFeedback, setImageFeedback] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
          setImages(
            [...(p.images ?? [])]
              .sort((a, b) => a.position - b.position)
              .map((img, idx) => ({ ...img, position: idx }))
          );
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

  const defaultAltText = name.trim() || "Foto da peça Menina Mulher";

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImageError(null);
    setImageFeedback(null);

    try {
      validateProductImageFile(file);
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : "Arquivo de foto inválido.");
      return;
    }

    const resolvedAlt = imageAltInput.trim() || defaultAltText;
    const previewUrl = createLocalPreviewUrl(file);

    if (isEditMode && id) {
      setIsUploadingImage(true);
      try {
        let added: ProductImageSummary;
        try {
          added = await uploadProductImageFile(id, file, {
            altText: resolvedAlt,
            isPrimary: images.length === 0,
          });
        } catch (apiErr: unknown) {
          if (apiErr instanceof ProductsApiError && apiErr.code === "DEMO_READ_ONLY") {
            added = applyDemoAddProductImage(id, {
              url: previewUrl,
              altText: resolvedAlt,
              isPrimary: images.length === 0,
            });
            setIsDemoMode(true);
          } else {
            throw apiErr;
          }
        }

        setImages((prev) =>
          [...prev, added]
            .sort((a, b) => a.position - b.position)
            .map((img, idx) => ({ ...img, position: idx }))
        );
        setImageAltInput("");
        setImageFeedback(`Foto "${file.name}" adicionada à galeria com sucesso.`);
      } catch (err: unknown) {
        setImageError(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
      } finally {
        setIsUploadingImage(false);
      }
      return;
    }

    const stagedItem: FormImageItem = {
      id: `staged-file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: previewUrl,
      altText: resolvedAlt,
      position: images.length,
      pendingFile: file,
    };

    setImages((prev) => [...prev, stagedItem]);
    setImageAltInput("");
    setImageFeedback(`Foto "${file.name}" pronta para o cadastro da peça.`);
  };

  const handleAddImageByUrl = async () => {
    setImageError(null);
    setImageFeedback(null);

    const trimmedUrl = imageUrlInput.trim();
    if (!trimmedUrl) {
      setImageError("Informe o link (URL) da foto antes de adicionar.");
      return;
    }

    const resolvedAlt = imageAltInput.trim() || defaultAltText;

    if (isEditMode && id) {
      setIsUploadingImage(true);
      try {
        let added: ProductImageSummary;
        try {
          added = await addProductImageByUrl(id, {
            url: trimmedUrl,
            altText: resolvedAlt,
            isPrimary: images.length === 0,
          });
        } catch (apiErr: unknown) {
          if (apiErr instanceof ProductsApiError && apiErr.code === "DEMO_READ_ONLY") {
            added = applyDemoAddProductImage(id, {
              url: trimmedUrl,
              altText: resolvedAlt,
              isPrimary: images.length === 0,
            });
            setIsDemoMode(true);
          } else {
            throw apiErr;
          }
        }

        setImages((prev) =>
          [...prev, added]
            .sort((a, b) => a.position - b.position)
            .map((img, idx) => ({ ...img, position: idx }))
        );
        setImageUrlInput("");
        setImageAltInput("");
        setImageFeedback("Foto adicionada à galeria com sucesso.");
      } catch (err: unknown) {
        setImageError(err instanceof Error ? err.message : "Não foi possível adicionar a foto.");
      } finally {
        setIsUploadingImage(false);
      }
      return;
    }

    const stagedItem: FormImageItem = {
      id: `staged-url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: trimmedUrl,
      altText: resolvedAlt,
      position: images.length,
    };

    setImages((prev) => [...prev, stagedItem]);
    setImageUrlInput("");
    setImageAltInput("");
    setImageFeedback("Foto adicionada à galeria da nova peça.");
  };

  const handleSetPrimaryImage = async (targetImage: FormImageItem) => {
    setImageError(null);
    setImageFeedback(null);

    if (isEditMode && id && !targetImage.id.startsWith("staged-")) {
      setIsUploadingImage(true);
      try {
        try {
          await updateProductImage(id, targetImage.id, { position: 0, isPrimary: true });
        } catch (apiErr: unknown) {
          if (apiErr instanceof ProductsApiError && apiErr.code === "DEMO_READ_ONLY") {
            applyDemoUpdateProductImage(id, targetImage.id, { position: 0, isPrimary: true });
            setIsDemoMode(true);
          } else {
            throw apiErr;
          }
        }
      } catch (err: unknown) {
        setImageError(
          err instanceof Error ? err.message : "Não foi possível definir a foto principal."
        );
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    setImages((prev) => {
      const others = prev.filter((item) => item.id !== targetImage.id);
      return [targetImage, ...others].map((item, idx) => ({ ...item, position: idx }));
    });
    setImageFeedback("Foto principal (capa) atualizada.");
  };

  const handleRemoveImage = async (targetImage: FormImageItem) => {
    setImageError(null);
    setImageFeedback(null);

    if (isEditMode && id && !targetImage.id.startsWith("staged-")) {
      setIsUploadingImage(true);
      try {
        try {
          await deleteProductImage(id, targetImage.id);
        } catch (apiErr: unknown) {
          if (apiErr instanceof ProductsApiError && apiErr.code === "DEMO_READ_ONLY") {
            applyDemoDeleteProductImage(id, targetImage.id);
            setIsDemoMode(true);
          } else {
            throw apiErr;
          }
        }
      } catch (err: unknown) {
        setImageError(err instanceof Error ? err.message : "Não foi possível remover a foto.");
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    setImages((prev) =>
      prev
        .filter((item) => item.id !== targetImage.id)
        .map((item, idx) => ({ ...item, position: idx }))
    );
    setImageFeedback("Foto removida da galeria.");
  };

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

  const persistStagedImagesForNewProduct = async (
    productId: string,
    productName: string
  ): Promise<void> => {
    for (let index = 0; index < images.length; index += 1) {
      const item = images[index];
      const altText = item.altText?.trim() || productName;

      if (item.pendingFile) {
        try {
          await uploadProductImageFile(productId, item.pendingFile, {
            altText,
            isPrimary: index === 0,
          });
        } catch (apiErr: unknown) {
          if (apiErr instanceof ProductsApiError && apiErr.code === "DEMO_READ_ONLY") {
            applyDemoAddProductImage(productId, {
              url: item.url,
              altText,
              position: index,
            });
          } else {
            throw apiErr;
          }
        }
      } else {
        try {
          await addProductImageByUrl(productId, {
            url: item.url,
            altText,
            position: index,
          });
        } catch (apiErr: unknown) {
          if (apiErr instanceof ProductsApiError && apiErr.code === "DEMO_READ_ONLY") {
            applyDemoAddProductImage(productId, {
              url: item.url,
              altText,
              position: index,
            });
          } else {
            throw apiErr;
          }
        }
      }
    }
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

      let saved: Product;
      try {
        saved = isEditMode && id ? await updateProduct(id, payload) : await createProduct(payload);
      } catch (apiErr: unknown) {
        if (apiErr instanceof ProductsApiError && apiErr.code === "DEMO_READ_ONLY") {
          saved =
            isEditMode && id
              ? applyDemoUpdateProduct(id, payload)
              : applyDemoCreateProduct(payload);
        } else {
          throw apiErr;
        }
      }

      if (!isEditMode && images.length > 0) {
        await persistStagedImagesForNewProduct(saved.id, saved.name);
      }

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
          Exibindo catálogo local de demonstração. As alterações salvas serão aplicadas na memória
          desta sessão para teste completo dos fluxos.
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

        {/* Galeria de Fotos Otimizadas da Peça (PBI #17 — RF02, RF04, RF12, RNF02, RNF07) */}
        <section
          aria-labelledby="product-gallery-heading"
          className="pt-4 border-t border-brand-border space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2
                id="product-gallery-heading"
                className="font-editorial text-lg font-bold text-brand-plum flex items-center gap-2"
              >
                <ImagePlus className="w-5 h-5 text-brand-primary" />
                Fotos da Peça ({images.length})
              </h2>
              <p className="text-xs text-text-secondary">
                Envie arquivos (JPG, PNG ou WEBP até 10 MB) ou adicione por link. A primeira foto é
                a capa exibida na vitrine.
              </p>
            </div>

            <label
              htmlFor="product-image-file-input"
              className="min-h-11 px-4 py-2.5 rounded-xl bg-brand-blush text-brand-plum font-semibold text-xs inline-flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
            >
              <Upload className="w-4 h-4 text-brand-primary" />
              <span>Enviar Arquivo (até 10 MB)</span>
              <input
                id="product-image-file-input"
                type="file"
                aria-label="Selecionar arquivo de foto"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploadingImage}
                onChange={(e) => void handleFileChange(e)}
                className="sr-only"
              />
            </label>
          </div>

          {imageError && (
            <Alert
              variant="error"
              title="Não foi possível adicionar a foto"
              onClose={() => setImageError(null)}
            >
              {imageError}
            </Alert>
          )}

          {imageFeedback && (
            <Alert
              variant="success"
              title="Galeria Atualizada"
              onClose={() => setImageFeedback(null)}
            >
              {imageFeedback}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-brand-soft/40 border border-brand-border rounded-xl p-3.5">
            <div className="sm:col-span-5">
              <Input
                label="Link (URL) da Foto"
                placeholder="https://exemplo.com/foto-peca.webp"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                leftIcon={<Link2 className="w-4 h-4" />}
              />
            </div>

            <div className="sm:col-span-5">
              <Input
                label="Texto Alternativo (Acessibilidade)"
                placeholder={`Ex.: ${defaultAltText}`}
                value={imageAltInput}
                onChange={(e) => setImageAltInput(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                fullWidth
                disabled={isUploadingImage}
                onClick={() => void handleAddImageByUrl()}
              >
                Adicionar Foto
              </Button>
            </div>
          </div>

          {images.length === 0 ? (
            <div className="rounded-xl border border-dashed border-brand-border bg-brand-soft/30 p-5 text-center">
              <p className="text-xs font-semibold text-brand-plum">
                Nenhuma foto adicionada para esta peça ainda.
              </p>
              <p className="text-[11px] text-brand-muted mt-0.5">
                Use o botão "Enviar Arquivo (até 10 MB)" ou informe um link acima para ilustrar a
                vitrine.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((img, index) => {
                const isPrimary = index === 0;
                return (
                  <div
                    key={img.id}
                    data-testid={`product-image-card-${index}`}
                    className={`rounded-xl border p-3 flex items-center gap-3 ${
                      isPrimary
                        ? "border-brand-primary bg-brand-blush/20"
                        : "border-brand-border bg-brand-surface"
                    }`}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-brand-soft border border-brand-border shrink-0 flex items-center justify-center">
                      <img
                        src={img.url}
                        alt={img.altText ?? defaultAltText}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isPrimary ? (
                          <Badge variant="blush">Foto Principal (Capa)</Badge>
                        ) : (
                          <Badge variant="neutral">Foto #{index + 1}</Badge>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-brand-plum truncate">
                        {img.altText || defaultAltText}
                      </p>
                      <p className="text-[11px] text-brand-muted truncate">{img.url}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isPrimary && (
                        <button
                          type="button"
                          disabled={isUploadingImage}
                          aria-label={`Definir foto ${index + 1} como capa`}
                          onClick={() => void handleSetPrimaryImage(img)}
                          className="min-w-11 min-h-11 px-2.5 rounded-xl border border-brand-border bg-brand-surface text-xs font-semibold text-brand-plum hover:bg-brand-soft inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Star className="w-3.5 h-3.5 text-brand-primary" />
                          <span>Capa</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isUploadingImage}
                        aria-label={`Remover foto ${index + 1}`}
                        onClick={() => void handleRemoveImage(img)}
                        className="min-w-11 min-h-11 rounded-xl border border-brand-border bg-brand-surface text-status-danger hover:bg-status-danger-bg inline-flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

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
