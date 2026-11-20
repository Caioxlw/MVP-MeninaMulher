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

interface RawOrderItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: string | number;
  size: string;
  color: string;
  productName: string;
}

interface RawOrder {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  totalAmount: string | number;
  items?: RawOrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface RawPaginatedOrdersResponse {
  data?: unknown;
  meta?: Partial<OrdersPaginationMeta>;
}

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

function toNumber(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOrderItem(raw: RawOrderItem): AdminOrderItem {
  return {
    id: String(raw.id),
    variantId: String(raw.variantId),
    quantity: Number(raw.quantity) || 0,
    unitPrice: toNumber(raw.unitPrice),
    size: String(raw.size),
    color: String(raw.color),
    productName: String(raw.productName),
  };
}

function normalizeOrder(raw: RawOrder): AdminOrder {
  return {
    id: String(raw.id),
    orderNumber: Number(raw.orderNumber),
    status: raw.status,
    totalAmount: toNumber(raw.totalAmount),
    items: Array.isArray(raw.items) ? raw.items.map(normalizeOrderItem) : [],
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

function buildOrdersUrl(params: GetAdminOrdersParams = {}): string {
  const query = new URLSearchParams();
  if (params.status && params.status !== "ALL") {
    query.set("status", params.status);
  }
  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  const qs = query.toString();
  return qs ? `/api/admin/orders?${qs}` : "/api/admin/orders";
}

async function readErrorMessage(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
    message?: unknown;
  } | null;
  if (body && typeof body.error === "string" && body.error.trim()) {
    return body.error;
  }
  if (body && typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }
  return null;
}

export function sortOrdersNewestFirst(orders: AdminOrder[]): AdminOrder[] {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function formatOrderNumber(orderNumber: number): string {
  return `#${String(orderNumber).padStart(4, "0")}`;
}

export function formatOrderDateTime(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return DATE_TIME_FORMATTER.format(parsed);
}

export function getOrderStatusMeta(status: OrderStatus): { label: string; variant: BadgeVariant } {
  return ORDER_STATUS_META[status];
}

export async function getAdminOrders(
  params: GetAdminOrdersParams = {}
): Promise<PaginatedOrdersResult> {
  const headers: Record<string, string> = {};
  const token = getAdminSession()?.token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildOrdersUrl(params), { headers });
  } catch {
    throw new OrdersApiError("OFFLINE", OFFLINE_MESSAGE);
  }

  if (!response.ok) {
    const apiMessage = await readErrorMessage(response);
    if (response.status === 401 || response.status === 403) {
      clearAdminSession();
      throw new OrdersApiError("UNAUTHORIZED", SESSION_EXPIRED_MESSAGE, response.status);
    }
    if (response.status === 400) {
      throw new OrdersApiError(
        "VALIDATION",
        apiMessage ?? "Parâmetros inválidos para consulta de pedidos.",
        response.status
      );
    }
    if (response.status >= 500) {
      throw new OrdersApiError("OFFLINE", OFFLINE_MESSAGE, response.status);
    }
    throw new OrdersApiError(
      "UNKNOWN",
      apiMessage ?? "Não foi possível carregar os pedidos. Tente de novo.",
      response.status
    );
  }

  const body = (await response.json().catch(() => null)) as RawPaginatedOrdersResponse | null;
  if (!body || !Array.isArray(body.data)) {
    throw new OrdersApiError(
      "UNKNOWN",
      "Resposta inesperada ao carregar pedidos administrativos.",
      response.status
    );
  }

  const orders = sortOrdersNewestFirst((body.data as RawOrder[]).map(normalizeOrder));
  const meta: OrdersPaginationMeta = {
    page: Number(body.meta?.page ?? params.page ?? 1),
    limit: Number(body.meta?.limit ?? params.limit ?? 20),
    total: Number(body.meta?.total ?? orders.length),
    totalPages: Number(body.meta?.totalPages ?? 1),
  };

  return { data: orders, meta };
}
