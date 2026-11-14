import { Router } from "express";
import rateLimit from "express-rate-limit";
import { VariantController } from "../controllers/variant.controller";
import { requireAdminAuth } from "../middlewares/auth.middleware";

const variantRoutes = Router({ mergeParams: true });
const variantController = new VariantController();

const variantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rota pública para consultar variações e saldos de estoque de um produto (RF02, US02)
variantRoutes.get("/", variantLimiter, variantController.listByProduct);

// Rota pública para validar adição de variação ao carrinho bloqueando esgotados (RF05, PBI #21)
variantRoutes.post("/:variantId/validate-cart", variantLimiter, variantController.validateCart);

// Rotas administrativas protegidas por requireAdminAuth (RF11, RF12, RF13, US09, US10)
variantRoutes.post("/", variantLimiter, requireAdminAuth, variantController.create);
variantRoutes.patch("/:variantId", variantLimiter, requireAdminAuth, variantController.update);
variantRoutes.delete("/:variantId", variantLimiter, requireAdminAuth, variantController.remove);

export { variantRoutes };
