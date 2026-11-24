import type { ProductStockStatus } from "../components/ui/ProductCard";
import type { FavoriteItem } from "../types/cart";
import { resolveProductOverallAvailability, type StoreProductVariant } from "./availability";
import { resolveColorHex } from "./stockApi";

export interface ApiCategoryDto {
  id: string;
  name: string;
  slug: string;
}

export interface ApiProductImageDto {
  id?: string;
  url: string;
  altText?: string | null;
  position?: number;
}

export interface ApiProductVariantDto {
  id: string;
  size: string;
  color: string;
  stock: number;
}

export interface ApiPublicProductDto {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  active?: boolean;
  featured?: boolean;
  categoryId?: string | null;
  category?: ApiCategoryDto | null;
  images?: ApiProductImageDto[];
  variants?: ApiProductVariantDto[];
}

export interface CatalogProductImage {
  id: string;
  url: string;
  altText: string;
  position: number;
}

export interface CatalogProductItem {
  id: string;
  name: string;
  category: string;
  categorySlug: string | null;
  subtitle: string;
  price: number;
  installmentText: string;
  imageUrl?: string;
  imageAlt: string;
  images: CatalogProductImage[];
  sizes: string[];
  colors: string[];
  colorNames: string[];
  badgeText?: string;
  featured: boolean;
  stockStatus: ProductStockStatus;
  variants: StoreProductVariant[];
}

export interface PublicCatalogQueryFilters {
  featured?: boolean;
  categoryId?: string;
  categorySlug?: string;
}

export interface PublicProductDetailResult {
  status: "ok" | "not_found" | "error";
  product: CatalogProductItem | null;
  errorMessage?: string;
}

export const DEFAULT_CATALOG_CATEGORY_NAMES: readonly string[] = [
  "Conjuntos",
  "Sutiãs",
  "Calcinhas",
  "Pijamas & Baby Doll",
];

/**
 * Mapeamento canônico de slugs de rota (`/categoria/:slug`) para rótulos amigáveis exibidos
 * no cabeçalho do catálogo e nos filtros (`PBI #38` / `Task #233` — `RF03`, `US02`).
 * Compatível tanto com as categorias do seed quanto com as 9 categorias definidas pela empresária.
 */
export const CATALOG_CATEGORY_SLUG_LABELS: Record<string, string> = {
  "partes-de-cima": "Partes de Cima",
  "partes-de-baixo": "Partes de Baixo",
  conjuntos: "Conjuntos",
  sutias: "Sutiãs",
  calcinhas: "Calcinhas",
  "pijamas-baby-doll": "Pijamas & Baby Doll",
  "conjunto-lingerie-com-bojo": "Conjunto lingerie com bojo",
  "conjunto-lingerie-sem-bojo": "Conjunto lingerie sem bojo",
  "baby-doll": "Baby Doll",
  "conjuntos-ousados": "Conjuntos ousados",
  "calcinhas-tradicionais-semi-fio-duplo": "Calcinhas tradicionais, semi, fio duplo",
  "conjunto-plus": "Conjunto plus (46,48,50 e 52)",
  "conjunto-plus-46-48-50-e-52": "Conjunto plus (46,48,50 e 52)",
  "baby-doll-plus": "Baby Doll Plus",
  "conjuntos-ousados-plus": "Conjuntos ousados plus",
  "sex-shop": "Sex Shop",
};

/**
 * Normaliza texto removendo acentos e caracteres especiais para comparação e geração de slug.
 */
export function normalizeCategoryToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve o nome de exibição amigável a partir de um slug de rota `/categoria/:slug`.
 */
export function resolveCategoryLabelFromSlug(slug?: string | null): string | null {
  if (!slug || !slug.trim()) {
    return null;
  }
  const cleanSlug = slug.trim().toLowerCase();
  return (
    CATALOG_CATEGORY_SLUG_LABELS[cleanSlug] ??
    CATALOG_CATEGORY_SLUG_LABELS[normalizeCategoryToken(cleanSlug)] ??
    slug.trim()
  );
}

const TOPS_CATEGORY_TOKENS = new Set([
  "partes-de-cima",
  "sutias",
  "sutia",
  "tops",
  "top",
  "bodies",
  "body",
]);

const BOTTOMS_CATEGORY_TOKENS = new Set([
  "partes-de-baixo",
  "calcinhas",
  "calcinha",
  "calcinhas-tradicionais-semi-fio-duplo",
]);

const SETS_CATEGORY_TOKENS = new Set([
  "conjuntos",
  "conjunto",
  "conjunto-lingerie-com-bojo",
  "conjunto-lingerie-sem-bojo",
  "conjuntos-ousados",
  "conjunto-plus",
  "conjunto-plus-46-48-50-e-52",
  "conjuntos-ousados-plus",
]);

const SLEEPWEAR_CATEGORY_TOKENS = new Set([
  "pijamas-baby-doll",
  "pijamas-e-baby-doll",
  "baby-doll",
  "baby-doll-plus",
]);

/**
 * Verifica se um produto do catálogo corresponde ao filtro de categoria selecionado
 * (seja uma categoria direta da API, uma das 9 categorias da empresária ou um agrupamento
 * de menu como `Partes de Cima`, `Partes de Baixo` ou `Conjuntos` — `PBI #38` / `Task #233`).
 */
export function matchesCatalogCategoryFilter(
  product: Pick<CatalogProductItem, "category" | "categorySlug">,
  filterValue?: string | null
): boolean {
  if (!filterValue || !filterValue.trim()) {
    return true;
  }

  const normalizedFilter = normalizeCategoryToken(filterValue);
  if (normalizedFilter === "todas" || normalizedFilter === "todos") {
    return true;
  }

  const productCategoryToken = normalizeCategoryToken(product.category || "");
  const productSlugToken = normalizeCategoryToken(product.categorySlug || "");

  if (productCategoryToken === normalizedFilter || productSlugToken === normalizedFilter) {
    return true;
  }

  if (normalizedFilter === "partes-de-cima") {
    return (
      TOPS_CATEGORY_TOKENS.has(productCategoryToken) ||
      TOPS_CATEGORY_TOKENS.has(productSlugToken) ||
      productCategoryToken.includes("sutia") ||
      productCategoryToken.includes("top") ||
      productCategoryToken.includes("body")
    );
  }

  if (normalizedFilter === "partes-de-baixo") {
    return (
      BOTTOMS_CATEGORY_TOKENS.has(productCategoryToken) ||
      BOTTOMS_CATEGORY_TOKENS.has(productSlugToken) ||
      productCategoryToken.includes("calcinha")
    );
  }

  if (normalizedFilter === "conjuntos") {
    return (
      SETS_CATEGORY_TOKENS.has(productCategoryToken) ||
      SETS_CATEGORY_TOKENS.has(productSlugToken) ||
      productCategoryToken.startsWith("conjunto")
    );
  }

  if (normalizedFilter === "pijamas-baby-doll" || normalizedFilter === "baby-doll") {
    return (
      SLEEPWEAR_CATEGORY_TOKENS.has(productCategoryToken) ||
      SLEEPWEAR_CATEGORY_TOKENS.has(productSlugToken) ||
      productCategoryToken.includes("baby-doll") ||
      productCategoryToken.includes("pijama")
    );
  }

  return false;
}

/**
 * Busca a lista de categorias públicas em `GET /api/categories` (`RF03`, `US02`).
 */
export async function fetchPublicCategories(): Promise<ApiCategoryDto[]> {
  const response = await fetch("/api/categories");
  if (!response.ok) {
    throw new Error("Não foi possível carregar as categorias do catálogo.");
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return (data as ApiCategoryDto[])
    .filter(
      (cat) =>
        cat &&
        typeof cat.id === "string" &&
        typeof cat.name === "string" &&
        cat.name.trim().length > 0
    )
    .map((cat) => ({
      id: cat.id,
      name: cat.name.trim(),
      slug:
        typeof cat.slug === "string" && cat.slug.trim().length > 0
          ? cat.slug.trim()
          : normalizeCategoryToken(cat.name),
    }));
}

/**
 * Normaliza e ordena a lista de fotos da galeria de um produto (`RF04`, `RNF07` — PBI #22).
 */
export function resolveProductGalleryImages(product: {
  id: string;
  name: string;
  imageUrl?: string;
  imageAlt?: string;
  images?: CatalogProductImage[];
}): CatalogProductImage[] {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return [...product.images]
      .filter((img) => typeof img.url === "string" && img.url.trim().length > 0)
      .sort((a, b) => a.position - b.position)
      .map((img, idx) => ({
        id: img.id || `${product.id}-img-${idx}`,
        url: img.url.trim(),
        altText: img.altText?.trim() || product.name,
        position: typeof img.position === "number" ? img.position : idx,
      }));
  }

  if (typeof product.imageUrl === "string" && product.imageUrl.trim().length > 0) {
    return [
      {
        id: `${product.id}-img-0`,
        url: product.imageUrl.trim(),
        altText: product.imageAlt?.trim() || product.name,
        position: 0,
      },
    ];
  }

  return [];
}

const CATALOG_COLOR_HEX_MAP: Record<string, string> = {
  "vermelho rubi": "#9E1B46",
  rubi: "#9E1B46",
  preto: "#23101B",
  "preto profundo": "#23101B",
  branco: "#FFFFFF",
  "branco puro": "#FFFFFF",
  nude: "#E5C3B5",
  "nude areia": "#E5C3B5",
  "rosa chá": "#F5CCD0",
  "rosa cha": "#F5CCD0",
  rosa: "#F5CCD0",
  rosé: "#F5CCD0",
  rose: "#F5CCD0",
  "rosa pétala": "#F5CCD0",
  "rosa petala": "#F5CCD0",
  cinza: "#6F4F64",
  grafite: "#6F4F64",
  vinho: "#520139",
};

export function resolveCatalogColorHex(colorName: string): string {
  const normalized = colorName.trim().toLowerCase();
  return CATALOG_COLOR_HEX_MAP[normalized] ?? resolveColorHex(colorName);
}

export function formatInstallmentText(price: number): string {
  const safePrice = Number.isFinite(price) && price > 0 ? price : 0;
  if (safePrice >= 90) {
    const installment = (safePrice / 3).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    return `3x de ${installment} s/ juros`;
  }
  if (safePrice >= 50) {
    const installment = (safePrice / 2).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    return `2x de ${installment} s/ juros`;
  }
  return "À vista";
}

/**
 * Converte um produto bruto retornado pela API (`GET /api/products`) no formato de exibição
 * do catálogo público da Menina Mulher (PBI #20 — RF02, RNF02, RNF07, US01).
 */
export function mapApiProductToCatalogItem(raw: ApiPublicProductDto): CatalogProductItem {
  const rawPrice = typeof raw.price === "number" ? raw.price : Number(raw.price);
  const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;

  const sortedImages: CatalogProductImage[] = Array.isArray(raw.images)
    ? [...raw.images]
        .filter((img) => typeof img?.url === "string" && img.url.trim().length > 0)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((img, index) => ({
          id: img.id ?? `${raw.id}-img-${index}`,
          url: img.url.trim(),
          altText: img.altText?.trim() || raw.name,
          position: typeof img.position === "number" ? img.position : index,
        }))
    : [];

  const primaryImage = sortedImages[0];

  const mappedVariants: StoreProductVariant[] = Array.isArray(raw.variants)
    ? raw.variants.map((v) => ({
        id: v.id,
        size: v.size.trim(),
        color: v.color.trim(),
        colorHex: resolveCatalogColorHex(v.color),
        stock: Number.isFinite(v.stock) ? Math.max(0, Math.trunc(v.stock)) : 0,
      }))
    : [];

  const uniqueSizes: string[] = [];
  const uniqueColorNames: string[] = [];
  const uniqueColorHexes: string[] = [];

  for (const variant of mappedVariants) {
    if (!uniqueSizes.includes(variant.size)) {
      uniqueSizes.push(variant.size);
    }
    if (!uniqueColorNames.includes(variant.color)) {
      uniqueColorNames.push(variant.color);
      uniqueColorHexes.push(variant.colorHex);
    }
  }

  const stockStatus: ProductStockStatus =
    mappedVariants.length > 0
      ? resolveProductOverallAvailability(mappedVariants).status
      : "available";

  const featured = Boolean(raw.featured);

  return {
    id: raw.id,
    name: raw.name.trim(),
    category: raw.category?.name?.trim() || "Coleção Exclusiva",
    categorySlug: raw.category?.slug?.trim() || null,
    subtitle: raw.description?.trim() || "Conforto e sofisticação em cada detalhe.",
    price,
    installmentText: formatInstallmentText(price),
    imageUrl: primaryImage?.url,
    imageAlt: primaryImage?.altText || raw.name.trim(),
    images: sortedImages,
    sizes: uniqueSizes,
    colors: uniqueColorHexes,
    colorNames: uniqueColorNames,
    badgeText: featured ? "Destaque" : undefined,
    featured,
    stockStatus,
    variants: mappedVariants,
  };
}

/**
 * Busca a lista de produtos ativos do catálogo público em `GET /api/products` (RF02, US01).
 * Filtra apenas produtos com `active !== false` e lança erro caso a API esteja indisponível.
 */
export async function fetchPublicProducts(
  filters?: PublicCatalogQueryFilters
): Promise<CatalogProductItem[]> {
  const params = new URLSearchParams();
  if (typeof filters?.featured === "boolean") {
    params.set("featured", String(filters.featured));
  }
  if (filters?.categoryId?.trim()) {
    params.set("categoryId", filters.categoryId.trim());
  }
  if (filters?.categorySlug?.trim()) {
    params.set("category", filters.categorySlug.trim());
  }

  const queryString = params.toString();
  const url = queryString ? `/api/products?${queryString}` : "/api/products";

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Não foi possível carregar os produtos do catálogo.");
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    if (
      data &&
      typeof data === "object" &&
      "status" in data &&
      (data as { status?: unknown }).status === "healthy"
    ) {
      return [];
    }
    throw new Error("Formato inválido de resposta ao consultar o catálogo de produtos.");
  }

  return (data as ApiPublicProductDto[])
    .filter((item) => item && typeof item.id === "string" && item.active !== false)
    .map(mapApiProductToCatalogItem);
}

/**
 * Busca os dados públicos detalhados de um único produto ativo em `GET /api/products/:id` (PBI #22 — RF04, RF05).
 * Diferencia retorno válido (`ok`), produto inexistente/oculto (`not_found`) e falha de rede (`error`).
 */
export async function fetchPublicProductDetail(
  productId: string
): Promise<PublicProductDetailResult> {
  try {
    const response = await fetch(`/api/products/${encodeURIComponent(productId)}`);
    if (response.status === 404) {
      return {
        status: "not_found",
        product: null,
        errorMessage: "Produto não encontrado ou indisponível no catálogo.",
      };
    }

    if (!response.ok) {
      return {
        status: "error",
        product: null,
        errorMessage: "Não foi possível carregar os detalhes deste produto.",
      };
    }

    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("id" in data) ||
      !("name" in data) ||
      (data as ApiPublicProductDto).active === false
    ) {
      return {
        status: "not_found",
        product: null,
        errorMessage: "Produto não encontrado ou indisponível no catálogo.",
      };
    }

    return {
      status: "ok",
      product: mapApiProductToCatalogItem(data as ApiPublicProductDto),
    };
  } catch {
    return {
      status: "error",
      product: null,
      errorMessage: "Não foi possível conectar ao servidor para carregar os detalhes do produto.",
    };
  }
}

/**
 * Converte um produto do catálogo público para o formato persistido em Favoritos (`PBI #23` / `#217`).
 * Inclui automaticamente a primeira variação em estoque (quando existir) para suportar
 * transferência direta para a sacola.
 */
export function mapCatalogProductToFavorite(product: CatalogProductItem): FavoriteItem {
  const defaultVariant = product.variants.find((variant) => variant.stock > 0);

  return {
    productId: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    ...(defaultVariant
      ? {
          variantId: defaultVariant.id,
          color: defaultVariant.color,
          colorHex: defaultVariant.colorHex,
          size: defaultVariant.size,
        }
      : {}),
  };
}

/**
 * Busca os dados públicos de um único produto ativo em `GET /api/products/:id`.
 */
export async function fetchPublicProductById(
  productId: string
): Promise<CatalogProductItem | null> {
  const result = await fetchPublicProductDetail(productId);
  return result.product;
}
