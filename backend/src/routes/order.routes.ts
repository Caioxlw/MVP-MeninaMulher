import { Router } from "express";
import rateLimit from "express-rate-limit";
import { OrderController } from "../controllers/order.controller";
import { requireAdminAuth } from "../middlewares/auth.middleware";

const adminOrderRoutes = Router();
const orderController = new OrderController();

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

adminOrderRoutes.use(orderLimiter);
adminOrderRoutes.use(requireAdminAuth);

// Rotas administrativas de pedidos em /api/admin/orders (PBI #31 - RF14, RF15, RNF05)
adminOrderRoutes.get("/", orderController.list);
adminOrderRoutes.get("/:id", orderController.getById);
adminOrderRoutes.patch("/:id/confirm", orderController.confirm);
adminOrderRoutes.patch("/:id/cancel", orderController.cancel);

export { adminOrderRoutes };
