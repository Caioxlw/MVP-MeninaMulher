import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ProductImageController } from "../controllers/product-image.controller";
import { handleUploadSingleImage } from "../lib/upload";
import { requireAdminAuth } from "../middlewares/auth.middleware";

const productImageRoutes = Router({ mergeParams: true });
const productImageController = new ProductImageController();

const imageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rota pública para consultar galeria de fotos ordenada por posição (RF02, RF04, US01)
productImageRoutes.get("/", imageLimiter, productImageController.listByProduct);

// Rotas administrativas protegidas por requireAdminAuth (RF11, RF12, RNF02, RNF07, US09, US11)
productImageRoutes.post(
  "/",
  imageLimiter,
  requireAdminAuth,
  handleUploadSingleImage,
  productImageController.create
);
productImageRoutes.patch(
  "/:imageId",
  imageLimiter,
  requireAdminAuth,
  productImageController.update
);
productImageRoutes.delete(
  "/:imageId",
  imageLimiter,
  requireAdminAuth,
  productImageController.remove
);

export { productImageRoutes };
