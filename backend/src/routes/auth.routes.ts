import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { requireAdminAuth } from "../middlewares/auth.middleware";

const authRoutes = Router();
const authController = new AuthController();

// Rota pública de autenticação da empresária (RF11, RNF05)
authRoutes.post("/login", authController.login);

// Rota protegida para obter dados públicos da sessão autenticada
authRoutes.get("/me", requireAdminAuth, authController.me);

export { authRoutes };
