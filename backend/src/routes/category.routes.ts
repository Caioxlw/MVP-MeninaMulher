import { Router } from "express";
import rateLimit from "express-rate-limit";
import { CategoryController } from "../controllers/category.controller";

const categoryRoutes = Router();
const categoryController = new CategoryController();

const categoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

categoryRoutes.use(categoryLimiter);

// Rota pública para listagem de categorias (RF03, US02)
categoryRoutes.get("/", categoryLimiter, categoryController.list);

export { categoryRoutes };
