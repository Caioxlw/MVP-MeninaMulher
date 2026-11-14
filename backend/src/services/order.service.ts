import type { OrderStatus } from "@prisma/client";
import {
  type FindAllOrdersParams,
  OrderRepository,
  type RawOrderRecord,
} from "../repositories/order.repository";

export class OrderError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "OrderError";
    this.statusCode = statusCode;
  }
}

export interface FormattedOrderItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: string | number;
  size: string;
  color: string;
  productName: string;
}

export interface FormattedOrder {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  totalAmount: string | number;
  items: FormattedOrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ListOrdersQuery {
  status?: unknown;
  page?: unknown;
  limit?: unknown;
}

export interface PaginatedOrdersResult {
  data: FormattedOrder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderStatusLogEntry {
  event: "ORDER_STATUS_CHANGE";
  orderId: string;
  orderNumber: number;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  actorId?: string;
  timestamp: string;
}

export type OrderStatusLogger = (entry: OrderStatusLogEntry) => void;

export interface OrderRepositoryPort {
  findAll: (params: FindAllOrdersParams) => Promise<{ items: RawOrderRecord[]; total: number }>;
  findById: (id: string) => Promise<RawOrderRecord | null>;
  updateStatus: (id: string, status: OrderStatus) => Promise<RawOrderRecord>;
}

export interface OrderServicePort {
  listOrders: (query?: ListOrdersQuery) => Promise<PaginatedOrdersResult>;
  getOrderById: (id: string) => Promise<FormattedOrder>;
  confirmOrder: (id: string, actorId?: string) => Promise<FormattedOrder>;
  cancelOrder: (id: string, actorId?: string) => Promise<FormattedOrder>;
}

const VALID_ORDER_STATUSES = new Set<OrderStatus>(["PENDING", "CONFIRMED", "CANCELLED"]);
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const defaultOrderLogger: OrderStatusLogger = (entry) => {
  console.info(JSON.stringify(entry));
};

function serializeDecimal(value: unknown): string | number {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (value !== null && typeof value === "object" && "toString" in value) {
    return String(value);
  }
  return String(value ?? "0");
}

function formatOrder(raw: RawOrderRecord): FormattedOrder {
  return {
    id: raw.id,
    orderNumber: raw.orderNumber,
    status: raw.status,
    totalAmount: serializeDecimal(raw.totalAmount),
    items: (raw.items ?? []).map((item) => ({
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: serializeDecimal(item.unitPrice),
      size: item.variant.size,
      color: item.variant.color,
      productName: item.variant.product.name,
    })),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function parsePositiveIntParam(
  rawValue: unknown,
  defaultValue: number,
  fieldName: string,
  maxValue?: number
): number {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return defaultValue;
  }

  const parsed = typeof rawValue === "number" ? rawValue : Number(String(rawValue).trim());
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new OrderError(
      `O parâmetro '${fieldName}' deve ser um número inteiro maior ou igual a 1.`,
      400
    );
  }

  if (maxValue !== undefined && parsed > maxValue) {
    throw new OrderError(`O parâmetro '${fieldName}' não pode ser maior que ${maxValue}.`, 400);
  }

  return parsed;
}

function parseOptionalStatus(rawStatus: unknown): OrderStatus | undefined {
  if (rawStatus === undefined || rawStatus === null || rawStatus === "") {
    return undefined;
  }

  if (typeof rawStatus !== "string") {
    throw new OrderError("O filtro 'status' informado é inválido.", 400);
  }

  const normalized = rawStatus.trim().toUpperCase() as OrderStatus;
  if (!VALID_ORDER_STATUSES.has(normalized)) {
    throw new OrderError(
      "O filtro 'status' deve ser um dos valores: PENDING, CONFIRMED ou CANCELLED.",
      400
    );
  }

  return normalized;
}

/**
 * Camada de regras de negócio de pedidos administrativos (`Order` - RF14, RF15, RNF06).
 */
export class OrderService implements OrderServicePort {
  private readonly orderRepository: OrderRepositoryPort;
  private readonly orderLogger: OrderStatusLogger;

  constructor(
    orderRepository: OrderRepositoryPort = new OrderRepository(),
    orderLogger: OrderStatusLogger = defaultOrderLogger
  ) {
    this.orderRepository = orderRepository;
    this.orderLogger = orderLogger;
  }

  /**
   * Lista pedidos administrativos paginados, ordenados do mais recente para o mais antigo.
   */
  async listOrders(query: ListOrdersQuery = {}): Promise<PaginatedOrdersResult> {
    const status = parseOptionalStatus(query.status);
    const page = parsePositiveIntParam(query.page, DEFAULT_PAGE, "page");
    const limit = parsePositiveIntParam(query.limit, DEFAULT_LIMIT, "limit", MAX_LIMIT);

    const { items, total } = await this.orderRepository.findAll({
      ...(status ? { status } : {}),
      page,
      limit,
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: items.map(formatOrder),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Consulta os detalhes de um pedido pelo ID ou lança `OrderError` 404 se não existir.
   */
  async getOrderById(id: string): Promise<FormattedOrder> {
    const existing = await this.findExistingOrderOrThrow(id);
    return formatOrder(existing);
  }

  /**
   * Confirma um pedido com status `PENDING` (`PENDING -> CONFIRMED`).
   */
  async confirmOrder(id: string, actorId?: string): Promise<FormattedOrder> {
    return this.transitionPendingOrder(id, "CONFIRMED", actorId, async (order) => {
      // Ponto de extensão reservado para a baixa atômica de estoque na confirmação (PBI #33).
      return this.orderRepository.updateStatus(order.id, "CONFIRMED");
    });
  }

  /**
   * Cancela um pedido com status `PENDING` (`PENDING -> CANCELLED`).
   */
  async cancelOrder(id: string, actorId?: string): Promise<FormattedOrder> {
    return this.transitionPendingOrder(id, "CANCELLED", actorId, async (order) =>
      this.orderRepository.updateStatus(order.id, "CANCELLED")
    );
  }

  private async findExistingOrderOrThrow(id: string): Promise<RawOrderRecord> {
    if (!id || typeof id !== "string" || !id.trim()) {
      throw new OrderError("ID do pedido inválido.", 400);
    }

    const order = await this.orderRepository.findById(id.trim());
    if (!order) {
      throw new OrderError("Pedido não encontrado.", 404);
    }

    return order;
  }

  private async transitionPendingOrder(
    id: string,
    targetStatus: Extract<OrderStatus, "CONFIRMED" | "CANCELLED">,
    actorId: string | undefined,
    persistTransition: (order: RawOrderRecord) => Promise<RawOrderRecord>
  ): Promise<FormattedOrder> {
    const existing = await this.findExistingOrderOrThrow(id);

    if (existing.status !== "PENDING") {
      throw new OrderError(
        `Não é possível alterar um pedido que já está com status ${existing.status}.`,
        409
      );
    }

    const updated = await persistTransition(existing);

    this.emitStatusChangeLog({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      previousStatus: existing.status,
      newStatus: updated.status,
      actorId,
    });

    return formatOrder(updated);
  }

  private emitStatusChangeLog(params: {
    orderId: string;
    orderNumber: number;
    previousStatus: OrderStatus;
    newStatus: OrderStatus;
    actorId?: string;
  }): void {
    try {
      this.orderLogger({
        event: "ORDER_STATUS_CHANGE",
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        previousStatus: params.previousStatus,
        newStatus: params.newStatus,
        ...(params.actorId ? { actorId: params.actorId } : {}),
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Falhas no logger não devem reverter a transição de status do pedido
    }
  }
}
