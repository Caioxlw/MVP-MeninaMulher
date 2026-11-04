import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { app } from "../server";

describe("Backend API Endpoints", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /api/info deve retornar os metadados da aplicação", async () => {
    const response = await request(app).get("/api/info");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      app: "MVP Menina Mulher API",
      version: "1.0.0",
    });
    expect(response.body.timestamp).toBeDefined();
  });

  it("GET /api/health deve retornar o status da API e conexão com o PostgreSQL", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("healthy");
    expect(response.body.services.api.status).toBe("up");
    expect(response.body.services.database.status).toBe("connected");
  });
});
