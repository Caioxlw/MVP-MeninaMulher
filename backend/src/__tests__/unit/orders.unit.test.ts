import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

type OrderStatusType = "PENDING" | "CONFIRMED" | "CANCELLED";

interface RawOrderItemRecord {
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

interface RawOrderRecord {
  id: string;
  orderNumber: number;
  status: OrderStatusType;
  totalAmount: unknown;
  items: RawOrderItemRecord[];
  createdAt: Date;
  updatedAt: Date;
}

interface FormattedOrderItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: string | number;
  size: string;
  color: string;
  productName: string;
}

interface FormattedOrder {
  id: string;
  orderNumber: number;
  status: OrderStatusType;
  totalAmount: string | number;
  items: FormattedOrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface PaginatedOrdersResult {
  data: FormattedOrder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface OrderStatusLogEntry {
  event: "ORDER_STATUS_CHANGE";
  orderId: string;
  orderNumber: number;
  previousStatus: OrderStatusType;
  newStatus: OrderStatusType;
  actorId?: string;
  timestamp: string;
}

interface OrderRepositoryModule {
  OrderRepository: new (dbClient?: unknown) => {
    findAll: (params: {
      status?: OrderStatusType;
      page: number;
      limit: number;
    }) => Promise<{ items: RawOrderRecord[]; total: number }>;
    findById: (id: string) => Promise<RawOrderRecord | null>;
    updateStatus: (id: string, status: OrderStatusType) => Promise<RawOrderRecord>;
  };
}

interface OrderServiceModule {
  OrderError: new (
    message: string,
    statusCode?: number
  ) => Error & {
    statusCode: number;
  };
  OrderService: new (
    orderRepository?: unknown,
    orderLogger?: (entry: OrderStatusLogEntry) => void
  ) => {
    listOrders: (query?: {
      status?: unknown;
      page?: unknown;
      limit?: unknown;
    }) => Promise<PaginatedOrdersResult>;
    getOrderById: (id: string) => Promise<FormattedOrder>;
    confirmOrder: (id: string, actorId?: string) => Promise<FormattedOrder>;
    cancelOrder: (id: string, actorId?: string) => Promise<FormattedOrder>;
  };
}

interface OrderControllerModule {
  OrderController: new (orderService?: unknown) => {
    list: (req: Request, res: Response) => Promise<void>;
    getById: (req: Request, res: Response) => Promise<void>;
    confirm: (req: Request, res: Response) => Promise<void>;
    cancel: (req: Request, res: Response) => Promise<void>;
  };
}

async function loadModule<T>(relativePath: string): Promise<T> {
  return (await import(relativePath)) as T;
}

function createSampleRawOrder(overrides: Partial<RawOrderRecord> = {}): RawOrderRecord {
  const now = new Date("2026-11-14T03:00:00.000Z");
  return {
    id: "ord-1",
    orderNumber: 1001,
    status: "PENDING",
    totalAmount: "149.80",
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: "item-1",
        orderId: "ord-1",
        variantId: "var-aurora-p",
        quantity: 1,
        unitPrice: "89.90",
        variant: {
          id: "var-aurora-p",
          size: "P",
          color: "Rubi",
          productId: "prod-aurora",
          product: {
            id: "prod-aurora",
            name: "Conjunto Renda Aurora",
          },
        },
      },
      {
        id: "item-2",
        orderId: "ord-1",
        variantId: "var-perola-m",
        quantity: 1,
        unitPrice: "59.90",
        variant: {
          id: "var-perola-m",
          size: "M",
          color: "Branco",
          productId: "prod-perola",
          product: {
            id: "prod-perola",
            name: "Sutiã Renda Pérola",
          },
        },
      },
    ],
    ...overrides,
  };
}

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe("Unidade — Camadas de Pedidos Administrativos (PBI #31 / Task #198 [red])", () => {
  describe("OrderRepository (backend/src/repositories/order.repository.ts)", () => {
    it("deve listar pedidos ordenados por createdAt desc com filtro opcional por status, paginação (skip/take) e include de items.variant.product", async () => {
      const { OrderRepository } = await loadModule<OrderRepositoryModule>(
        "../../repositories/order.repository"
      );

      const sampleOrder = createSampleRawOrder();
      const mockFindMany = vi.fn().mockResolvedValue([sampleOrder]);
      const mockCount = vi.fn().mockResolvedValue(1);

      const repo = new OrderRepository({
        order: {
          findMany: mockFindMany,
          count: mockCount,
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      });

      const result = await repo.findAll({
        status: "PENDING",
        page: 2,
        limit: 10,
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          skip: 10,
          take: 10,
          include: expect.objectContaining({
            items: expect.objectContaining({
              include: expect.objectContaining({
                variant: expect.objectContaining({
                  include: expect.objectContaining({
                    product: true,
                  }),
                }),
              }),
            }),
          }),
        })
      );
      expect(mockCount).toHaveBeenCalledWith({
        where: { status: "PENDING" },
      });
      expect(result).toEqual({
        items: [sampleOrder],
        total: 1,
      });
    });

    it("deve buscar pedido por id com itens, variação e produto via findById e atualizar status via updateStatus", async () => {
      const { OrderRepository } = await loadModule<OrderRepositoryModule>(
        "../../repositories/order.repository"
      );

      const sampleOrder = createSampleRawOrder();
      const confirmedOrder = createSampleRawOrder({ status: "CONFIRMED" });
      const mockFindUnique = vi.fn().mockResolvedValue(sampleOrder);
      const mockUpdate = vi.fn().mockResolvedValue(confirmedOrder);

      const repo = new OrderRepository({
        order: {
          findMany: vi.fn(),
          count: vi.fn(),
          findUnique: mockFindUnique,
          update: mockUpdate,
        },
      });

      const found = await repo.findById("ord-1");
      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ord-1" },
          include: expect.objectContaining({
            items: expect.anything(),
          }),
        })
      );
      expect(found?.id).toBe("ord-1");

      const updated = await repo.updateStatus("ord-1", "CONFIRMED");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ord-1" },
          data: { status: "CONFIRMED" },
          include: expect.objectContaining({
            items: expect.anything(),
          }),
        })
      );
      expect(updated.status).toBe("CONFIRMED");
    });
  });

  describe("OrderService (backend/src/services/order.service.ts)", () => {
    it("deve listar pedidos paginados (defaults page=1, limit=20) formatando items com size, color e productName sem expor dados pessoais", async () => {
      const { OrderService } = await loadModule<OrderServiceModule>("../../services/order.service");

      const sampleOrder = createSampleRawOrder();
      const mockFindAll = vi.fn().mockResolvedValue({
        items: [sampleOrder],
        total: 25,
      });

      const service = new OrderService({
        findAll: mockFindAll,
        findById: vi.fn(),
        updateStatus: vi.fn(),
      });

      const response = await service.listOrders({
        status: "PENDING",
        page: "2",
        limit: "10",
      });

      expect(mockFindAll).toHaveBeenCalledWith({
        status: "PENDING",
        page: 2,
        limit: 10,
      });
      expect(response.meta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
      expect(response.data).toHaveLength(1);
      expect(response.data[0]).toMatchObject({
        id: "ord-1",
        orderNumber: 1001,
        status: "PENDING",
        items: [
          {
            id: "item-1",
            variantId: "var-aurora-p",
            quantity: 1,
            size: "P",
            color: "Rubi",
            productName: "Conjunto Renda Aurora",
          },
          {
            id: "item-2",
            variantId: "var-perola-m",
            quantity: 1,
            size: "M",
            color: "Branco",
            productName: "Sutiã Renda Pérola",
          },
        ],
      });
      expect(response.data[0]).not.toHaveProperty("customerName");
      expect(response.data[0]).not.toHaveProperty("customerPhone");
    });

    it("deve lançar OrderError 400 para filtro status inválido ou parâmetros de paginação inválidos (page < 1, limit < 1, limit > 100)", async () => {
      const { OrderService } = await loadModule<OrderServiceModule>("../../services/order.service");

      const service = new OrderService({
        findAll: vi.fn(),
        findById: vi.fn(),
        updateStatus: vi.fn(),
      });

      await expect(service.listOrders({ status: "SHIPPED" })).rejects.toMatchObject({
        statusCode: 400,
      });

      await expect(service.listOrders({ page: 0 })).rejects.toMatchObject({
        statusCode: 400,
      });

      await expect(service.listOrders({ limit: 0 })).rejects.toMatchObject({
        statusCode: 400,
      });

      await expect(service.listOrders({ limit: 101 })).rejects.toMatchObject({
        statusCode: 400,
      });

      await expect(service.listOrders({ page: "abc" })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("deve retornar pedido detalhado em getOrderById ou lançar OrderError 404 quando não encontrado", async () => {
      const { OrderService } = await loadModule<OrderServiceModule>("../../services/order.service");

      const sampleOrder = createSampleRawOrder();
      const mockFindById = vi.fn().mockResolvedValueOnce(sampleOrder).mockResolvedValueOnce(null);

      const service = new OrderService({
        findAll: vi.fn(),
        findById: mockFindById,
        updateStatus: vi.fn(),
      });

      const order = await service.getOrderById("ord-1");
      expect(order.id).toBe("ord-1");
      expect(order.items[0]).toMatchObject({
        variantId: "var-aurora-p",
        size: "P",
        color: "Rubi",
        productName: "Conjunto Renda Aurora",
      });

      await expect(service.getOrderById("ord-inexistente")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("deve confirmar (PENDING -> CONFIRMED) e cancelar (PENDING -> CANCELLED) pedidos pendentes e rejeitar já finalizados com 409 Conflict", async () => {
      const { OrderService } = await loadModule<OrderServiceModule>("../../services/order.service");

      const pendingOrder = createSampleRawOrder({ id: "ord-pending", status: "PENDING" });
      const confirmedOrder = createSampleRawOrder({ id: "ord-pending", status: "CONFIRMED" });
      const cancelledOrder = createSampleRawOrder({ id: "ord-pending", status: "CANCELLED" });

      const mockFindById = vi
        .fn()
        .mockResolvedValueOnce(pendingOrder) // confirmOrder ok
        .mockResolvedValueOnce(pendingOrder) // cancelOrder ok
        .mockResolvedValueOnce(confirmedOrder) // confirmOrder em pedido já CONFIRMED -> 409
        .mockResolvedValueOnce(cancelledOrder) // confirmOrder em pedido já CANCELLED -> 409
        .mockResolvedValueOnce(confirmedOrder) // cancelOrder em pedido já CONFIRMED -> 409
        .mockResolvedValueOnce(null); // confirmOrder em pedido inexistente -> 404

      const mockUpdateStatus = vi
        .fn()
        .mockResolvedValueOnce(confirmedOrder)
        .mockResolvedValueOnce(cancelledOrder);

      const mockLogger = vi.fn();

      const service = new OrderService(
        {
          findAll: vi.fn(),
          findById: mockFindById,
          updateStatus: mockUpdateStatus,
        },
        mockLogger
      );

      const confirmedResult = await service.confirmOrder("ord-pending", "admin-1");
      expect(confirmedResult.status).toBe("CONFIRMED");
      expect(mockUpdateStatus).toHaveBeenCalledWith("ord-pending", "CONFIRMED");
      expect(mockLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "ORDER_STATUS_CHANGE",
          orderId: "ord-pending",
          previousStatus: "PENDING",
          newStatus: "CONFIRMED",
          actorId: "admin-1",
        })
      );

      const cancelledResult = await service.cancelOrder("ord-pending", "admin-1");
      expect(cancelledResult.status).toBe("CANCELLED");
      expect(mockUpdateStatus).toHaveBeenCalledWith("ord-pending", "CANCELLED");

      await expect(service.confirmOrder("ord-pending")).rejects.toMatchObject({
        statusCode: 409,
      });

      await expect(service.confirmOrder("ord-pending")).rejects.toMatchObject({
        statusCode: 409,
      });

      await expect(service.cancelOrder("ord-pending")).rejects.toMatchObject({
        statusCode: 409,
      });

      await expect(service.confirmOrder("ord-404")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("OrderController (backend/src/controllers/order.controller.ts)", () => {
    it("deve extrair query/params, delegar ao OrderService e formatar respostas HTTP 200, 400, 404 e 409", async () => {
      const { OrderController } = await loadModule<OrderControllerModule>(
        "../../controllers/order.controller"
      );
      const { OrderError } = await loadModule<OrderServiceModule>("../../services/order.service");

      const mockListOrders = vi.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
      const mockGetOrderById = vi
        .fn()
        .mockResolvedValueOnce({ id: "ord-1", status: "PENDING", items: [] })
        .mockRejectedValueOnce(new OrderError("Pedido não encontrado.", 404));
      const mockConfirmOrder = vi
        .fn()
        .mockResolvedValueOnce({ id: "ord-1", status: "CONFIRMED", items: [] })
        .mockRejectedValueOnce(new OrderError("Pedido já finalizado.", 409));
      const mockCancelOrder = vi
        .fn()
        .mockResolvedValueOnce({ id: "ord-1", status: "CANCELLED", items: [] })
        .mockRejectedValueOnce(new OrderError("Status inválido.", 400));

      const controller = new OrderController({
        listOrders: mockListOrders,
        getOrderById: mockGetOrderById,
        confirmOrder: mockConfirmOrder,
        cancelOrder: mockCancelOrder,
      });

      // 200 em list
      const listRes = createMockResponse();
      await controller.list(
        { query: { status: "PENDING", page: "1", limit: "10" } } as unknown as Request,
        listRes
      );
      expect(mockListOrders).toHaveBeenCalledWith({
        status: "PENDING",
        page: "1",
        limit: "10",
      });
      expect(listRes.status).toHaveBeenCalledWith(200);

      // 200 e 404 em getById
      const getOkRes = createMockResponse();
      await controller.getById({ params: { id: "ord-1" } } as unknown as Request, getOkRes);
      expect(getOkRes.status).toHaveBeenCalledWith(200);

      const get404Res = createMockResponse();
      await controller.getById({ params: { id: "ord-404" } } as unknown as Request, get404Res);
      expect(get404Res.status).toHaveBeenCalledWith(404);

      // 200 e 409 em confirm
      const confirmOkRes = createMockResponse();
      await controller.confirm(
        { params: { id: "ord-1" }, user: { id: "admin-1" } } as unknown as Request,
        confirmOkRes
      );
      expect(confirmOkRes.status).toHaveBeenCalledWith(200);

      const confirm409Res = createMockResponse();
      await controller.confirm({ params: { id: "ord-1" } } as unknown as Request, confirm409Res);
      expect(confirm409Res.status).toHaveBeenCalledWith(409);

      // 200 e 400 em cancel
      const cancelOkRes = createMockResponse();
      await controller.cancel(
        { params: { id: "ord-1" }, user: { id: "admin-1" } } as unknown as Request,
        cancelOkRes
      );
      expect(cancelOkRes.status).toHaveBeenCalledWith(200);

      const cancel400Res = createMockResponse();
      await controller.cancel({ params: { id: "ord-1" } } as unknown as Request, cancel400Res);
      expect(cancel400Res.status).toHaveBeenCalledWith(400);
    });
  });
});
