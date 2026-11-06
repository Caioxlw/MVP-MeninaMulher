import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma";
import path from "path";
import { upload } from "./lib/upload";
import { requireAdminAuth } from "./middlewares/auth.middleware";
import { authRoutes } from "./routes/auth.routes";
import { categoryRoutes } from "./routes/category.routes";
import { adminProductRoutes, productRoutes } from "./routes/product.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === "test" ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(apiLimiter);

// Disponibiliza as imagens da pasta uploads publicamente
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// Rotas de Autenticação da Empresária (PBI #3 - RF11, RNF05)
app.use("/api/auth", authRoutes);

// Rotas de Categorias e Produtos (PBI #16 - RF01, RF02, RF03, RF11, RF12)
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin/products", adminProductRoutes);

// Endpoint de Informações da Aplicação
app.get("/api/info", (_req: Request, res: Response) => {
  res.json({
    app: "MVP Menina Mulher API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Endpoint de Verificação de Integridade (Health Check)
app.get("/api/health", async (_req: Request, res: Response) => {
  let dbStatus: "connected" | "disconnected" = "disconnected";
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const startTime = Date.now();
    // Executa query simples para validar conectividade com o PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - startTime;
    dbStatus = "connected";
  } catch (error: any) {
    dbError = error.message || "Erro desconhecido ao conectar com PostgreSQL";
  }

  const isHealthy = dbStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      api: {
        status: "up",
        port: PORT,
      },
      database: {
        status: dbStatus,
        provider: "PostgreSQL",
        latencyMs: dbLatencyMs,
        error: dbError,
      },
    },
  });
});

// Endpoint da Task #13: Prova de Conceito de Armazenamento de Fotos (protegido por ADMIN - RF11)
app.post(
  "/api/upload",
  apiLimiter,
  requireAdminAuth,
  upload.single("image"),
  (req: Request, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "Nenhum arquivo enviado." });
      return;
    }

    // Monta a URL pública dinâmica da imagem salva
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: "Foto enviada com sucesso!",
      file: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl, // <--- Link público que será usado no produto
      },
    });
  }
);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 MVP Menina Mulher - Backend API`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

export { app, prisma };
