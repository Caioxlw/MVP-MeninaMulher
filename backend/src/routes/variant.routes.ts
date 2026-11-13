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

// Rotas administrativas protegidas por requireAdminAuth (RF11, RF12, RF13, US09, US10)
variantRoutes.post("/", variantLimiter, requireAdminAuth, variantController.create);
variantRoutes.patch("/:variantId", variantLimiter, requireAdminAuth, variantController.update);
variantRoutes.delete("/:variantId", variantLimiter, requireAdminAuth, variantController.remove);

export { variantRoutes };
