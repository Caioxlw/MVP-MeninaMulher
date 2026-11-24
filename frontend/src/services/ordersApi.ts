import type { BadgeVariant } from "../components/ui/Badge";
import { clearAdminSession, getAdminSession } from "./authApi";

export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type OrderStatusFilter = "ALL" | OrderStatus;

export interface AdminOrderItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  size: string;
  color: string;
  productName: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  totalAmount: number;
  items: AdminOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrdersPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedOrdersResult {
  data: AdminOrder[];
  meta: OrdersPaginationMeta;
}

export interface GetAdminOrdersParams {
  status?: OrderStatusFilter;
  page?: number;
  limit?: number;
}

export type OrdersApiErrorCode = "UNAUTHORIZED" | "VALIDATION" | "OFFLINE" | "UNKNOWN";

export class OrdersApiError extends Error {
  readonly code: OrdersApiErrorCode;
  readonly status: number | null;

  constructor(code: OrdersApiErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "OrdersApiError";
    this.code = code;
    this.status = status;
  }
}

type RawOrder = Omit<AdminOrder, "totalAmount" | "items"> & {
  totalAmount: string | number;
  items?: Array<Omit<AdminOrderItem, "unitPrice"> & { unitPrice: string | number }>;
};

const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou. Entre novamente.";
const OFFLINE_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.";

const ORDER_STATUS_META: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "Pendente", variant: "lowStock" },
  CONFIRMED: { label: "Confirmado", variant: "available" },
  CANCELLED: { label: "Cancelado", variant: "outOfStock" },
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseTimestamp(isoDate: string): number {
  const time = Date.parse(isoDate);
  return Number.isNaN(time) ? 0 : time;
}

function normalizeOrder(raw: RawOrder): AdminOrder {
  return {
    id: String(raw.id ?? ""),
    orderNumber: Math.max(0, Math.trunc(toNumber(raw.orderNumber))),
    status: raw.status,
    totalAmount: toNumber(raw.totalAmount),
    items: Array.isArray(raw.items)
      ? raw.items.map((item) => ({
          id: String(item.id ?? ""),
          variantId: String(item.variantId ?? ""),
          quantity: toNumber(item.quantity),
          unitPrice: toNumber(item.unitPrice),
          size: String(item.size ?? ""),
          color: String(item.color ?? ""),
          productName: String(item.productName ?? ""),
        }))
      : [],
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

function buildOrdersUrl(params: GetAdminOrdersParams = {}): string {
  const query = new URLSearchParams();
  if (params.status && params.status !== "ALL") {
    query.set("status", params.status);
  }
  if (params.page !== undefined && Number.isFinite(params.page) && params.page > 0) {
    query.set("page", String(Math.trunc(params.page)));
  }
  if (params.limit !== undefined && Number.isFinite(params.limit) && params.limit > 0) {
    query.set("limit", String(Math.trunc(params.limit)));
  }
  const qs = query.toString();
  return qs ? `/api/admin/orders?${qs}` : "/api/admin/orders";
}

export function sortOrdersNewestFirst(orders: AdminOrder[]): AdminOrder[] {
  return [...orders].sort((a, b) => parseTimestamp(b.createdAt) - parseTimestamp(a.createdAt));
}

export function formatOrderNumber(orderNumber: number): string {
  const safe = Math.max(0, Math.trunc(toNumber(orderNumber)));
  return `#${String(safe).padStart(4, "0")}`;
}

export function formatOrderDateTime(isoDate: string): string {
  const time = Date.parse(isoDate);
  return Number.isNaN(time) ? "—" : DATE_TIME_FORMATTER.format(time);
}

export function getOrderStatusMeta(status: OrderStatus): { label: string; variant: BadgeVariant } {
  return ORDER_STATUS_META[status] ?? { label: String(status || "—"), variant: "neutral" };
}

export async function getAdminOrders(
  params: GetAdminOrdersParams = {}
): Promise<PaginatedOrdersResult> {
  const token = getAdminSession()?.token;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  let response: Response;
  try {
    response = await fetch(buildOrdersUrl(params), { headers });
  } catch {
    throw new OrdersApiError("OFFLINE", OFFLINE_MESSAGE);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAdminSession();
      throw new OrdersApiError("UNAUTHORIZED", SESSION_EXPIRED_MESSAGE, response.status);
    }
    if (response.status >= 500) {
      throw new OrdersApiError("OFFLINE", OFFLINE_MESSAGE, response.status);
    }

    const errBody = (await response.json().catch(() => null)) as {
      error?: unknown;
      message?: unknown;
    } | null;
    const apiMessage =
      typeof errBody?.error === "string" && errBody.error.trim()
        ? errBody.error
        : typeof errBody?.message === "string" && errBody.message.trim()
          ? errBody.message
          : null;

    if (response.status === 400) {
      throw new OrdersApiError(
        "VALIDATION",
        apiMessage ?? "Parâmetros inválidos para consulta de pedidos.",
        response.status
      );
    }
    throw new OrdersApiError(
      "UNKNOWN",
      apiMessage ?? "Não foi possível carregar os pedidos. Tente de novo.",
      response.status
    );
  }

  const body = (await response.json().catch(() => null)) as {
    data?: unknown;
    meta?: Partial<OrdersPaginationMeta>;
  } | null;
  if (!body || !Array.isArray(body.data)) {
    throw new OrdersApiError(
      "UNKNOWN",
      "Resposta inesperada ao carregar pedidos administrativos.",
      response.status
    );
  }

  const orders = sortOrdersNewestFirst((body.data as RawOrder[]).map(normalizeOrder));
  const total = Math.max(0, toNumber(body.meta?.total ?? orders.length));
  const limit = toNumber(body.meta?.limit ?? params.limit ?? 20) || 20;
  const meta: OrdersPaginationMeta = {
    page: toNumber(body.meta?.page ?? params.page ?? 1) || 1,
    limit,
    total,
    totalPages:
      body.meta?.totalPages !== undefined
        ? toNumber(body.meta.totalPages)
        : total === 0
          ? 0
          : Math.ceil(total / limit),
  };

  return { data: orders, meta };
}
