import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

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

// Endpoint de Usuários (Exemplo de consulta com Prisma)
app.get("/api/users", async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Falha ao consultar usuários no banco",
      error: error.message,
    });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 MVP Menina Mulher - Backend API`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

export { app };
