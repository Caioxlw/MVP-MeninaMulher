import type { OrderStatus, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../lib/prisma";

export interface RawOrderItemRecord {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  unitPrice: unknown;
  variant: {
    id: string;
    size: string;
    color: string;
    productId: string;
    product: {
      id: string;
      name: string;
    };
  };
}

export interface RawOrderRecord {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  totalAmount: unknown;
  items: RawOrderItemRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FindAllOrdersParams {
  status?: OrderStatus;
  page: number;
  limit: number;
}

export interface OrderDbClient {
  order: {
    findMany: (args: {
      where?: { status?: OrderStatus };
      orderBy: { createdAt: "desc" };
      skip: number;
      take: number;
      include: typeof ORDER_ITEMS_INCLUDE;
    }) => Promise<RawOrderRecord[]>;
    count: (args: { where?: { status?: OrderStatus } }) => Promise<number>;
    findUnique: (args: {
      where: { id: string };
      include: typeof ORDER_ITEMS_INCLUDE;
    }) => Promise<RawOrderRecord | null>;
    update: (args: {
      where: { id: string };
      data: { status: OrderStatus };
      include: typeof ORDER_ITEMS_INCLUDE;
    }) => Promise<RawOrderRecord>;
  };
}

const ORDER_ITEMS_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  },
} as const;

/**
 * Camada de acesso a dados de pedidos (`Order` e `OrderItem`), isolando 100% do `PrismaClient`.
 */
export class OrderRepository {
  private readonly db: OrderDbClient;

  constructor(dbClient: OrderDbClient | PrismaClient = defaultPrisma) {
    this.db = dbClient as OrderDbClient;
  }

  /**
   * Lista pedidos ordenados por `createdAt desc`, com filtro opcional por `status` e paginação.
   */
  async findAll(params: FindAllOrdersParams): Promise<{ items: RawOrderRecord[]; total: number }> {
    const where = params.status ? { status: params.status } : {};
    const skip = (params.page - 1) * params.limit;

    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: params.limit,
        include: ORDER_ITEMS_INCLUDE,
      }),
      this.db.order.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Busca um pedido pelo ID incluindo itens, variação (`size`, `color`) e produto (`name`).
   */
  async findById(id: string): Promise<RawOrderRecord | null> {
    return this.db.order.findUnique({
      where: { id },
      include: ORDER_ITEMS_INCLUDE,
    });
  }

  /**
   * Atualiza o status de um pedido e retorna o registro atualizado com seus itens.
   */
  async updateStatus(id: string, status: OrderStatus): Promise<RawOrderRecord> {
    return this.db.order.update({
      where: { id },
      data: { status },
      include: ORDER_ITEMS_INCLUDE,
    });
  }
}
