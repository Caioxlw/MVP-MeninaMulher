import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller";
import { requireAdminAuth } from "../middlewares/auth.middleware";

const authRoutes = Router();
const authController = new AuthController();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === "test" ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
});

authRoutes.use(authLimiter);

// Rota pública de autenticação da empresária (RF11, RNF05)
authRoutes.post("/login", authLimiter, authController.login);

// Rota protegida para obter dados públicos da sessão autenticada
authRoutes.get("/me", authLimiter, requireAdminAuth, authController.me);

export { authRoutes };
