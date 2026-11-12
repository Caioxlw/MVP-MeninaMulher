import { getAdminSession } from "./authApi";
import { formatPriceBRL, getAdminProducts, type Product } from "./productsApi";

export interface StockVariationItem {
  id: string;
  sku: string;
  size: string;
  color: string;
  label: string;
  colorHex: string;
  qty: number;
  alertText?: string;
  hasOrders?: boolean;
}

export interface StockProductGroup {
  id: string;
  code: string;
  category: string;
  name: string;
  unitPrice: string;
  unitPriceNumber: number;
  margin: string;
  variations: StockVariationItem[];
}

export interface ApiVariantDto {
  id: string;
  productId: string;
  size: string;
  color: string;
  stock: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVariantInput {
  size: string;
  color: string;
  stock: number;
}

export interface UpdateVariantInput {
  size?: string;
  color?: string;
  stock?: number;
}

const COLOR_HEX_MAP: Record<string, string> = {
  preto: "#23101B",
  "preto profundo": "#23101B",
  nude: "#E5C3B5",
  "nude areia": "#E5C3B5",
  rosa: "#F5CCD0",
  "rosa petala": "#F5CCD0",
  "rosa pétala": "#F5CCD0",
  branco: "#FFFFFF",
  "branco puro": "#FFFFFF",
  vinho: "#520139",
  rubi: "#D1025A",
  magenta: "#D1025A",
  cinza: "#6F4F64",
};

export function resolveColorHex(colorName: string): string {
  const key = colorName.trim().toLowerCase();
  return COLOR_HEX_MAP[key] ?? "#D1025A";
}

export function normalizeVariantSize(rawSize: string): string {
  const normalized = rawSize.trim().toUpperCase();
  if (!normalized) {
    throw new Error("O tamanho da variação é obrigatório.");
  }
  return normalized;
}

export function normalizeVariantColor(rawColor: string): string {
  const normalized = rawColor.trim();
  if (!normalized) {
    throw new Error("A cor da variação é obrigatória.");
  }
  return normalized;
}

/**
 * Garante a regra RNF09: nunca permitir saldo negativo na interface ou payload.
 */
export function clampNonNegativeStock(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

export function buildVariantSku(productCode: string, color: string, size: string): string {
  const prefix =
    productCode
      .split("-")[0]
      ?.replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase() || "MM";
  const colorCode =
    color
      .trim()
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "CR";
  const sizeCode = size.trim().toUpperCase() || "U";
  return `${prefix}-${colorCode}-${sizeCode}`;
}

export const INITIAL_STOCK_GROUPS: StockProductGroup[] = [
  {
    id: "srn",
    code: "SRN-2024",
    category: "PARTES DE CIMA",
    name: "Sutiã Renda Noir",
    unitPrice: "R$ 119,90",
    unitPriceNumber: 119.9,
    margin: "62%",
    variations: [
      {
        id: "var-srn-p-preto",
        sku: "SN-PR-P",
        size: "P",
        color: "Preto",
        label: "P · Preto",
        colorHex: "#23101B",
        qty: 3,
        hasOrders: true,
      },
      {
        id: "var-srn-m-preto",
        sku: "SN-PR-M",
        size: "M",
        color: "Preto",
        label: "M · Preto",
        colorHex: "#23101B",
        qty: 2,
        hasOrders: true,
      },
      {
        id: "var-srn-g-preto",
        sku: "SN-PR-G",
        size: "G",
        color: "Preto",
        label: "G · Preto",
        colorHex: "#6F4F64",
        qty: 0,
        hasOrders: false,
      },
      {
        id: "var-srn-m-nude",
        sku: "SN-NU-M",
        size: "M",
        color: "Nude Areia",
        label: "M · Nude Areia",
        colorHex: "#E5C3B5",
        qty: 5,
        hasOrders: false,
      },
    ],
  },
  {
    id: "cst",
    code: "CST-2024",
    category: "PARTES DE BAIXO",
    name: "Calcinha Soft Touch",
    unitPrice: "R$ 39,90",
    unitPriceNumber: 39.9,
    margin: "54%",
    variations: [
      {
        id: "var-cst-g-rosa",
        sku: "CST-RP-G",
        size: "G",
        color: "Rosa Pétala",
        label: "G · Rosa Pétala",
        colorHex: "#F5CCD0",
        qty: 1,
        alertText: "Atenção: Apenas 1 un. disponível (Falta 1 un. para Pedido #1040)",
        hasOrders: true,
      },
      {
        id: "var-cst-p-rosa",
        sku: "CST-RP-P",
        size: "P",
        color: "Rosa Pétala",
        label: "P · Rosa Pétala",
        colorHex: "#F5CCD0",
        qty: 6,
        hasOrders: false,
      },
      {
        id: "var-cst-m-rosa",
        sku: "CST-RP-M",
        size: "M",
        color: "Rosa Pétala",
        label: "M · Rosa Pétala",
        colorHex: "#F5CCD0",
        qty: 7,
        hasOrders: false,
      },
      {
        id: "var-cst-m-branco",
        sku: "CST-BR-M",
        size: "M",
        color: "Branco Puro",
        label: "M · Branco Puro",
        colorHex: "#FFFFFF",
        qty: 4,
        hasOrders: false,
      },
    ],
  },
  {
    id: "bml",
    code: "BML-2024",
    category: "PEÇA ÚNICA / LINHA NOITE",
    name: "Body Renda Manga Longa",
    unitPrice: "R$ 249,00",
    unitPriceNumber: 249.0,
    margin: "58%",
    variations: [
      {
        id: "var-bml-p-preto",
        sku: "BML-PR-P",
        size: "P",
        color: "Preto Profundo",
        label: "P · Preto Profundo",
        colorHex: "#23101B",
        qty: 0,
        hasOrders: false,
      },
      {
        id: "var-bml-m-preto",
        sku: "BML-PR-M",
        size: "M",
        color: "Preto Profundo",
        label: "M · Preto Profundo",
        colorHex: "#23101B",
        qty: 0,
        hasOrders: false,
      },
    ],
  },
];

function buildAuthHeaders(authToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = authToken || getAdminSession()?.token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchProductVariants(productId: string): Promise<ApiVariantDto[]> {
  const response = await fetch(`/api/products/${encodeURIComponent(productId)}/variants`);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Não foi possível carregar as variações do produto.");
  }
  return (await response.json()) as ApiVariantDto[];
}

export async function createProductVariant(
  productId: string,
  input: CreateVariantInput,
  authToken?: string
): Promise<ApiVariantDto> {
  const payload = {
    size: normalizeVariantSize(input.size),
    color: normalizeVariantColor(input.color),
    stock: clampNonNegativeStock(input.stock),
  };

  const response = await fetch(`/api/products/${encodeURIComponent(productId)}/variants`, {
    method: "POST",
    headers: buildAuthHeaders(authToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Erro ao cadastrar variação na API.");
  }

  return (await response.json()) as ApiVariantDto;
}

export async function updateProductVariant(
  productId: string,
  variantId: string,
  input: UpdateVariantInput,
  authToken?: string
): Promise<ApiVariantDto> {
  const payload: UpdateVariantInput = {};
  if (input.size !== undefined) {
    payload.size = normalizeVariantSize(input.size);
  }
  if (input.color !== undefined) {
    payload.color = normalizeVariantColor(input.color);
  }
  if (input.stock !== undefined) {
    payload.stock = clampNonNegativeStock(input.stock);
  }

  const response = await fetch(
    `/api/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
    {
      method: "PATCH",
      headers: buildAuthHeaders(authToken),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Erro ao atualizar variação na API.");
  }

  return (await response.json()) as ApiVariantDto;
}

export async function deleteProductVariant(
  productId: string,
  variantId: string,
  authToken?: string
): Promise<void> {
  const response = await fetch(
    `/api/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
    {
      method: "DELETE",
      headers: buildAuthHeaders(authToken),
    }
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Erro ao remover variação na API.");
  }
}

export function convertProductsToStockGroups(products: Product[]): StockProductGroup[] {
  return products.map((p) => {
    const code =
      p.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase() + "-2024";

    const variations: StockVariationItem[] = (p.variants || []).map((v) => {
      const sku = buildVariantSku(code, v.color, v.size);
      return {
        id: v.id,
        sku,
        size: v.size,
        color: v.color,
        label: `${v.size} · ${v.color}`,
        colorHex: resolveColorHex(v.color),
        qty: v.stock,
        hasOrders: false,
      };
    });

    return {
      id: p.id,
      code,
      category: p.category ? p.category.name.toUpperCase() : "GERAL",
      name: p.name,
      unitPrice: formatPriceBRL(p.price),
      unitPriceNumber: p.price,
      margin: "55%",
      variations,
    };
  });
}

export async function fetchAdminStockGroups(): Promise<{
  groups: StockProductGroup[];
  isDemo: boolean;
}> {
  const result = await getAdminProducts();
  const groups = convertProductsToStockGroups(result.data);
  return { groups, isDemo: result.demo };
}

export function exportStockCsv(groups: StockProductGroup[]): string {
  const header = "Produto,Codigo,Categoria,SKU,Tamanho,Cor,Quantidade,Status";
  const rows = groups.flatMap((g) =>
    g.variations.map((v) => {
      const status =
        v.qty === 0 ? "Indisponivel" : v.qty <= 2 ? "Ultimas unidades" : "Estoque regular";
      return `"${g.name}","${g.code}","${g.category}","${v.sku}","${v.size}","${v.color}",${v.qty},"${status}"`;
    })
  );
  return [header, ...rows].join("\n");
}
