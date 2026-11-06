import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ProductController } from "../controllers/product.controller";
import { requireAdminAuth } from "../middlewares/auth.middleware";
import { variantRoutes } from "./variant.routes";

const productRoutes = Router();
const adminProductRoutes = Router();
const productController = new ProductController();

const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

productRoutes.use(productLimiter);
adminProductRoutes.use(productLimiter);

// Sub-rotas de variações de produto (/api/products/:productId/variants - PBI #18)
productRoutes.use("/:productId/variants", variantRoutes);

// Rotas públicas da vitrine (apenas produtos com active: true - RF01, RF02, RF03, US01, US11)
productRoutes.get("/", productLimiter, productController.listPublic);
productRoutes.get("/:id", productLimiter, productController.getPublicById);

// Rotas administrativas de escrita em /api/products (protegidas por ADMIN - RF11, RF12)
productRoutes.post("/", productLimiter, requireAdminAuth, productController.create);
productRoutes.patch("/:id", productLimiter, requireAdminAuth, productController.update);
productRoutes.delete("/:id", productLimiter, requireAdminAuth, productController.delete);

// Rotas administrativas de leitura em /api/admin/products (ativos e ocultos - RF11, RF12)
adminProductRoutes.get("/", productLimiter, requireAdminAuth, productController.listAdmin);
adminProductRoutes.get("/:id", productLimiter, requireAdminAuth, productController.getAdminById);

export { adminProductRoutes, productRoutes };
