import { clearAdminSession, getAdminSession } from "./authApi";

/**
 * Cliente HTTP de produtos e categorias do painel (Task #149 / PBI #92).
 *
 * Consome a API REST da PBI #16. Quando a API está offline, o catálogo de
 * demonstração só é usado em desenvolvimento local (`import.meta.env.DEV`):
 * leituras retornam `demo: true` e mutações são bloqueadas, para nunca
 * simular um salvamento que não chegou ao banco. Em produção, a falha de
 * conexão é sempre informada como erro.
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ProductVariantSummary {
  id: string;
  size: string;
  color: string;
  stock: number;
}

export interface ProductImageSummary {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  featured: boolean;
  categoryId: string | null;
  category: Category | null;
  images: ProductImageSummary[];
  variants: ProductVariantSummary[];
  createdAt?: string;
  updatedAt?: string;
}

export type ProductStatusFilter = "all" | "active" | "hidden" | "featured";

export interface ProductFilter {
  status?: ProductStatusFilter;
  search?: string;
}

export interface CreateProductDto {
  name: string;
  description?: string | null;
  price: number;
  categoryId: string;
  active?: boolean;
  featured?: boolean;
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface ApiResult<T> {
  data: T;
  /** `true` quando os dados vieram do catálogo de demonstração (API offline em dev). */
  demo: boolean;
}

export type ProductsApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "OFFLINE"
  | "DEMO_READ_ONLY"
  | "UNKNOWN";

export class ProductsApiError extends Error {
  readonly code: ProductsApiErrorCode;
  readonly status: number | null;

  constructor(code: ProductsApiErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "ProductsApiError";
    this.code = code;
    this.status = status;
  }
}

const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou. Entre novamente.";
const OFFLINE_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.";
const DEMO_READ_ONLY_MESSAGE =
  "Modo demonstração: a API está offline e as alterações não serão salvas.";

export const DEMO_CATEGORIES: Category[] = [
  { id: "demo-cat-conjuntos", name: "Conjuntos", slug: "conjuntos" },
  { id: "demo-cat-sutias", name: "Sutiãs", slug: "sutias" },
  { id: "demo-cat-calcinhas", name: "Calcinhas", slug: "calcinhas" },
  { id: "demo-cat-pijamas", name: "Pijamas & Baby Doll", slug: "pijamas-baby-doll" },
];

function demoProduct(
  id: string,
  name: string,
  price: number,
  category: Category,
  options: { active?: boolean; featured?: boolean; stock?: number[] } = {}
): Product {
  const sizes = ["P", "M", "G"];
  return {
    id,
    name,
    description: null,
    price,
    active: options.active ?? true,
    featured: options.featured ?? false,
    categoryId: category.id,
    category,
    images: [],
    variants: (options.stock ?? []).map((stock, index) => ({
      id: `${id}-var-${index}`,
      size: sizes[index] ?? "ÚNICO",
      color: "Preto",
      stock,
    })),
  };
}

export const DEMO_PRODUCTS: Product[] = [
  demoProduct("demo-sutia-renda-noir", "Sutiã Renda Noir", 119.9, DEMO_CATEGORIES[1], {
    featured: true,
    stock: [3, 2, 0],
  }),
  demoProduct("demo-calcinha-algodao", "Calcinha Algodão Doce", 39.9, DEMO_CATEGORIES[2], {
    stock: [6, 7],
  }),
  demoProduct("demo-conjunto-microfibra", "Conjunto Microfibra Nude", 149.9, DEMO_CATEGORIES[0], {
    stock: [1, 1],
  }),
  demoProduct("demo-baby-doll-cetim", "Baby Doll Cetim Vinho", 129.9, DEMO_CATEGORIES[3], {
    active: false,
    featured: true,
    stock: [4],
  }),
];

function isDemoFallbackEnabled(): boolean {
  return import.meta.env.DEV === true;
}

function buildHeaders(withBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (withBody) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAdminSession()?.token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function readErrorMessage(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return body && typeof body.error === "string" && body.error.trim() ? body.error : null;
}

/** Erro de conexão: `fetch` rejeitou ou o proxy respondeu 5xx sem a mensagem JSON da API. */
class OfflineSignal extends Error {}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const hasBody = init.body !== undefined;
  let response: Response;

  try {
    response = await fetch(path, {
      method: init.method ?? "GET",
      headers: buildHeaders(hasBody),
      ...(hasBody ? { body: JSON.stringify(init.body) } : {}),
    });
  } catch {
    throw new OfflineSignal();
  }

  if (response.ok) {
    return (await response.json().catch(() => undefined)) as T;
  }

  const apiMessage = await readErrorMessage(response);

  if (response.status === 401 || response.status === 403) {
    clearAdminSession();
    throw new ProductsApiError("UNAUTHORIZED", SESSION_EXPIRED_MESSAGE, response.status);
  }
  if (response.status >= 500 && !apiMessage) {
    throw new OfflineSignal();
  }

  const fallbackMessage = "Não foi possível concluir a operação. Tente de novo.";
  const code: ProductsApiErrorCode =
    response.status === 400
      ? "VALIDATION"
      : response.status === 404
        ? "NOT_FOUND"
        : response.status === 409
          ? "CONFLICT"
          : "UNKNOWN";

  throw new ProductsApiError(code, apiMessage ?? fallbackMessage, response.status);
}

async function read<T>(path: string, demoData: () => T): Promise<ApiResult<T>> {
  try {
    return { data: await request<T>(path), demo: false };
  } catch (error) {
    if (error instanceof OfflineSignal) {
      if (isDemoFallbackEnabled()) {
        return { data: demoData(), demo: true };
      }
      throw new ProductsApiError("OFFLINE", OFFLINE_MESSAGE);
    }
    throw error;
  }
}

async function mutate<T>(path: string, method: string, body?: unknown): Promise<T> {
  try {
    return await request<T>(path, { method, body });
  } catch (error) {
    if (error instanceof OfflineSignal) {
      throw isDemoFallbackEnabled()
        ? new ProductsApiError("DEMO_READ_ONLY", DEMO_READ_ONLY_MESSAGE)
        : new ProductsApiError("OFFLINE", OFFLINE_MESSAGE);
    }
    throw error;
  }
}

type ApiProduct = Omit<Product, "price"> & { price: number | string };

function normalizeProduct(raw: ApiProduct): Product {
  return {
    ...raw,
    description: raw.description ?? null,
    price: Number(raw.price),
    categoryId: raw.categoryId ?? null,
    category: raw.category ?? null,
    images: raw.images ?? [],
    variants: raw.variants ?? [],
  };
}

function normalizeDto(dto: UpdateProductDto): UpdateProductDto {
  const payload: UpdateProductDto = {};
  if (dto.name !== undefined) payload.name = dto.name.trim();
  if (dto.description !== undefined) {
    const description = dto.description?.trim() ?? "";
    payload.description = description ? description : null;
  }
  if (dto.price !== undefined) payload.price = dto.price;
  if (dto.categoryId !== undefined) payload.categoryId = dto.categoryId;
  if (dto.active !== undefined) payload.active = dto.active;
  if (dto.featured !== undefined) payload.featured = dto.featured;
  return payload;
}

const productPath = (id: string) => `/api/products/${encodeURIComponent(id)}`;

export async function getAdminProducts(): Promise<ApiResult<Product[]>> {
  const result = await read<ApiProduct[]>("/api/admin/products", () => DEMO_PRODUCTS);
  return { ...result, data: result.demo ? DEMO_PRODUCTS : result.data.map(normalizeProduct) };
}

export async function getAdminProductById(id: string): Promise<ApiResult<Product>> {
  const result = await read<ApiProduct | null>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    () => DEMO_PRODUCTS.find((p) => p.id === id) ?? null
  );
  if (!result.data) {
    throw new ProductsApiError("NOT_FOUND", "Produto não encontrado.", 404);
  }
  return { demo: result.demo, data: normalizeProduct(result.data) };
}

export async function getCategories(): Promise<ApiResult<Category[]>> {
  return read<Category[]>("/api/categories", () => DEMO_CATEGORIES);
}

export async function createProduct(dto: CreateProductDto): Promise<Product> {
  return normalizeProduct(await mutate<ApiProduct>("/api/products", "POST", normalizeDto(dto)));
}

export async function updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
  return normalizeProduct(await mutate<ApiProduct>(productPath(id), "PATCH", normalizeDto(dto)));
}

export async function toggleProductActive(id: string, active: boolean): Promise<Product> {
  return updateProduct(id, { active });
}

export async function deleteProduct(id: string): Promise<void> {
  await mutate<unknown>(productPath(id), "DELETE");
}

/**
 * Converte o preço digitado pela empresária ("119,90", "R$ 1.234,56", "99.9")
 * para número. Retorna `NaN` quando o texto não é um preço válido.
 */
export function parsePriceInput(raw: string): number {
  let text = raw.replace(/R\$/i, "").replace(/\s/g, "");
  if (!text) return Number.NaN;
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
}

export function formatPriceBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function getTotalStock(product: Pick<Product, "variants">): number {
  return product.variants.reduce((total, variant) => total + variant.stock, 0);
}

function matchesStatus(product: Product, status: ProductStatusFilter): boolean {
  if (status === "active") return product.active;
  if (status === "hidden") return !product.active;
  if (status === "featured") return product.featured;
  return true;
}

export function filterProducts(products: Product[], filter: ProductFilter = {}): Product[] {
  const status = filter.status ?? "all";
  const search = filter.search?.trim().toLocaleLowerCase("pt-BR") ?? "";
  return products.filter(
    (product) =>
      matchesStatus(product, status) &&
      (!search || product.name.toLocaleLowerCase("pt-BR").includes(search))
  );
}

export function countProductsByStatus(products: Product[]): Record<ProductStatusFilter, number> {
  return {
    all: products.length,
    active: products.filter((p) => p.active).length,
    hidden: products.filter((p) => !p.active).length,
    featured: products.filter((p) => p.featured).length,
  };
}
