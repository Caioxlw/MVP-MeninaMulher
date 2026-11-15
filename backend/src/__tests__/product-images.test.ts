import fs from "fs";
import path from "path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { signJwt } from "../lib/security";
import { app, prisma } from "../server";

describe("Integração HTTP — Upload e Galeria de Fotos de Produtos (PBI #17 / Task #205)", () => {
  let adminToken: string;
  let productId: string;
  const createdFiles: string[] = [];

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-menina-mulher";
  });

  afterAll(() => {
    for (const filePath of createdFiles) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  beforeEach(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    const admin = await prisma.user.create({
      data: {
        name: "Admin Fotos",
        email: "admin.fotos@meninamulher.com",
        passwordHash: "hash-teste",
        role: "ADMIN",
      },
    });

    adminToken = signJwt({
      sub: admin.id,
      role: admin.role,
    });

    const category = await prisma.category.create({
      data: {
        name: "Sutiãs",
        slug: "sutias",
      },
    });

    const product = await prisma.product.create({
      data: {
        name: "Sutiã Renda Francesa",
        description: "Renda macia com aro",
        price: "129.90",
        categoryId: category.id,
      },
    });
    productId = product.id;
  });

  it("Cenário 1: envia arquivo de imagem (multipart) vinculado ao produto, define altText automático e retorna na galeria", async () => {
    const fakePngBuffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const uploadRes = await request(app)
      .post(`/api/products/${productId}/images`)
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("image", fakePngBuffer, {
        filename: "sutia-renda.png",
        contentType: "image/png",
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body).toMatchObject({
      productId,
      altText: "Sutiã Renda Francesa",
      position: 0,
    });
    expect(uploadRes.body.url).toMatch(/\/uploads\/.+\.png$/);

    const fileName = String(uploadRes.body.url).split("/uploads/")[1];
    if (fileName) {
      createdFiles.push(path.resolve(__dirname, "../../uploads", fileName));
    }

    const listRes = await request(app).get(`/api/products/${productId}/images`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(uploadRes.body.id);
  });

  it("Cenário 2: adiciona fotos por URL, altera foto principal (position 0) e renormaliza posições ao excluir", async () => {
    const firstRes = await request(app)
      .post(`/api/products/${productId}/images`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        url: "https://cdn.meninamulher.com/foto-1.webp",
        altText: "Vista frontal",
      });
    expect(firstRes.status).toBe(201);
    expect(firstRes.body.position).toBe(0);

    const secondRes = await request(app)
      .post(`/api/products/${productId}/images`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        url: "https://cdn.meninamulher.com/foto-2.webp",
        altText: "Vista costas",
      });
    expect(secondRes.status).toBe(201);
    expect(secondRes.body.position).toBe(1);

    // Define a segunda foto como capa principal (position: 0)
    const patchRes = await request(app)
      .patch(`/api/products/${productId}/images/${secondRes.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        position: 0,
        altText: "Capa oficial Sutiã Renda",
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.position).toBe(0);
    expect(patchRes.body.altText).toBe("Capa oficial Sutiã Renda");

    const orderedList = await request(app).get(`/api/products/${productId}/images`);
    expect(orderedList.body.map((i: { id: string }) => i.id)).toEqual([
      secondRes.body.id,
      firstRes.body.id,
    ]);

    // Exclui a foto de capa (secondRes) -> firstRes volta para position 0
    const delRes = await request(app)
      .delete(`/api/products/${productId}/images/${secondRes.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);

    const afterDeleteList = await request(app).get(`/api/products/${productId}/images`);
    expect(afterDeleteList.body).toHaveLength(1);
    expect(afterDeleteList.body[0].id).toBe(firstRes.body.id);
    expect(afterDeleteList.body[0].position).toBe(0);
  });

  it("Cenário 3: bloqueia formatos inválidos (400) e requisições sem token ADMIN (401)", async () => {
    const unauthRes = await request(app).post(`/api/products/${productId}/images`).send({
      url: "https://cdn.meninamulher.com/foto.webp",
    });
    expect(unauthRes.status).toBe(401);

    const invalidMimeRes = await request(app)
      .post(`/api/products/${productId}/images`)
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("image", Buffer.from("conteudo-texto"), {
        filename: "script.txt",
        contentType: "text/plain",
      });

    expect(invalidMimeRes.status).toBe(400);
    expect(invalidMimeRes.body.error).toMatch(/Apenas JPG, PNG e WEBP são permitidos/i);
  });
});
