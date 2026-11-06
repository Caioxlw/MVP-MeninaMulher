import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed";
import { prisma } from "../lib/prisma";
import { app } from "../server";
import { truncateAllTables } from "./helpers/test-db";

describe("Integração HTTP — Autenticação e Proteção de Rotas ADMIN (PBI #3 / Task #100)", () => {
  beforeEach(async () => {
    await truncateAllTables(prisma);
    await seedDatabase(prisma);
  });

  afterAll(async () => {
    await truncateAllTables(prisma);
    await prisma.$disconnect();
  });

  describe("POST /api/auth/login", () => {
    it("deve autenticar a empresária criada pelo seed e retornar 200 OK com token e user sem passwordHash", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "joana@meninamulher.com",
        password: "MeninaMulher@2026",
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toEqual(expect.any(String));
      expect(response.body.user).toMatchObject({
        name: "Joana Santos",
        email: "joana@meninamulher.com",
        role: "ADMIN",
      });
      expect(response.body.user.id).toEqual(expect.any(String));
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it("deve aceitar email com espaços nas bordas e letras maiúsculas/minúsculas", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "  JOANA@meninamulher.com ",
        password: "MeninaMulher@2026",
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toEqual(expect.any(String));
      expect(response.body.user.email).toBe("joana@meninamulher.com");
    });

    it("deve retornar 400 Bad Request quando email ou password não forem informados", async () => {
      const resNoEmail = await request(app).post("/api/auth/login").send({
        email: "   ",
        password: "MeninaMulher@2026",
      });
      expect(resNoEmail.status).toBe(400);

      const resNoPassword = await request(app).post("/api/auth/login").send({
        email: "joana@meninamulher.com",
        password: "",
      });
      expect(resNoPassword.status).toBe(400);
    });

    it("deve retornar 401 Unauthorized para senha incorreta, email inexistente ou usuária inativa (active: false)", async () => {
      const resWrongPass = await request(app).post("/api/auth/login").send({
        email: "joana@meninamulher.com",
        password: "SenhaIncorreta@2026",
      });
      expect(resWrongPass.status).toBe(401);

      const resUnknownEmail = await request(app).post("/api/auth/login").send({
        email: "outra@meninamulher.com",
        password: "MeninaMulher@2026",
      });
      expect(resUnknownEmail.status).toBe(401);

      await prisma.user.update({
        where: { email: "joana@meninamulher.com" },
        data: { active: false },
      });

      const resInactive = await request(app).post("/api/auth/login").send({
        email: "joana@meninamulher.com",
        password: "MeninaMulher@2026",
      });
      expect(resInactive.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("deve retornar 200 OK com os dados públicos da empresária quando enviado Bearer token válido", async () => {
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "joana@meninamulher.com",
        password: "MeninaMulher@2026",
      });
      expect(loginRes.status).toBe(200);

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${loginRes.body.token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user).toMatchObject({
        name: "Joana Santos",
        email: "joana@meninamulher.com",
        role: "ADMIN",
      });
      expect(meRes.body.user.passwordHash).toBeUndefined();
    });

    it("deve retornar 401 Unauthorized sem token, com token inválido ou se a usuária for desativada após emissão do token", async () => {
      const resNoToken = await request(app).get("/api/auth/me");
      expect(resNoToken.status).toBe(401);

      const resBadToken = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer token-invalido");
      expect(resBadToken.status).toBe(401);

      const loginRes = await request(app).post("/api/auth/login").send({
        email: "joana@meninamulher.com",
        password: "MeninaMulher@2026",
      });
      expect(loginRes.status).toBe(200);

      await prisma.user.update({
        where: { email: "joana@meninamulher.com" },
        data: { active: false },
      });

      const resAfterDeactivate = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${loginRes.body.token}`);
      expect(resAfterDeactivate.status).toBe(401);
    });
  });

  describe("Proteção da rota administrativa POST /api/upload", () => {
    it("deve retornar 401 Unauthorized sem token ADMIN e permitir upload (201 Created) quando autenticado", async () => {
      const fakePngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );

      const unauthRes = await request(app)
        .post("/api/upload")
        .attach("image", fakePngBuffer, { filename: "teste.png", contentType: "image/png" });
      expect(unauthRes.status).toBe(401);

      const loginRes = await request(app).post("/api/auth/login").send({
        email: "joana@meninamulher.com",
        password: "MeninaMulher@2026",
      });
      expect(loginRes.status).toBe(200);

      const authRes = await request(app)
        .post("/api/upload")
        .set("Authorization", `Bearer ${loginRes.body.token}`)
        .attach("image", fakePngBuffer, { filename: "teste.png", contentType: "image/png" });
      expect(authRes.status).toBe(201);
      expect(authRes.body.success).toBe(true);
    });
  });
});
