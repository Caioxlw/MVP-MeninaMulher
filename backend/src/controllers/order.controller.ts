import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { OrderError, OrderService, type OrderServicePort } from "../services/order.service";

function extractOrderId(req: Request): string {
  return String(req.params?.id ?? "");
}

/**
 * Controller HTTP administrativo de pedidos (`Order` - RF14, RF15).
 */
export class OrderController {
  private readonly orderService: OrderServicePort;

  constructor(orderService: OrderServicePort = new OrderService()) {
    this.orderService = orderService;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.orderService.listOrders({
        status: req.query?.status,
        page: req.query?.page,
        limit: req.query?.limit,
      });
      res.status(200).json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await this.orderService.getOrderById(extractOrderId(req));
      res.status(200).json(order);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  confirm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const confirmed = await this.orderService.confirmOrder(extractOrderId(req), req.user?.id);
      res.status(200).json(confirmed);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  cancel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const cancelled = await this.orderService.cancelOrder(extractOrderId(req), req.user?.id);
      res.status(200).json(cancelled);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: unknown, res: Response): void {
    if (error instanceof OrderError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Erro interno ao processar pedidos administrativos." });
  }
}
