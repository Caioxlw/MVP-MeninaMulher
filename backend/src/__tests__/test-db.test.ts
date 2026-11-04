import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import {
  assertTestDatabaseUrl,
  extractDatabaseName,
  toTestDatabaseUrl,
  truncateAllTables,
} from "./helpers/test-db";

describe("Infraestrutura de Banco de Testes Isolado", () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await truncateAllTables();
    await prisma.$disconnect();
  });

  it("deve executar os testes conectados exclusivamente a um banco terminado em '_test'", async () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.DATABASE_URL).toBeDefined();

    const dbName = extractDatabaseName(process.env.DATABASE_URL!);
    expect(dbName.endsWith("_test")).toBe(true);

    const currentDbResult = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database()
    `;
    expect(currentDbResult[0].current_database).toBe(dbName);
    expect(currentDbResult[0].current_database.endsWith("_test")).toBe(true);
  });

  it("deve abortar com erro explícito de segurança caso a DATABASE_URL não termine em '_test'", () => {
    expect(() => assertTestDatabaseUrl(undefined)).toThrow(/SEGURANÇA/);
    expect(() => assertTestDatabaseUrl("")).toThrow(/SEGURANÇA/);
    expect(() =>
      assertTestDatabaseUrl(
        "postgresql://postgres:postgres@localhost:5432/mvp_menina_mulher?schema=public"
      )
    ).toThrow(/SEGURANÇA/);
    expect(() =>
      assertTestDatabaseUrl("postgresql://postgres:postgres@localhost:5432/producao")
    ).toThrow(/SEGURANÇA/);

    const validUrl =
      "postgresql://postgres:postgres@localhost:5432/mvp_menina_mulher_test?schema=public";
    expect(assertTestDatabaseUrl(validUrl)).toBe(validUrl);
  });

  it("deve converter uma DATABASE_URL padrão para o banco equivalente '_test'", () => {
    const devUrl = "postgresql://postgres:segredo@localhost:5432/mvp_menina_mulher?schema=public";
    const converted = toTestDatabaseUrl(devUrl);

    expect(extractDatabaseName(converted)).toBe("mvp_menina_mulher_test");
    expect(converted).toContain("postgres:segredo@localhost:5432/mvp_menina_mulher_test");
  });

  it("deve limpar os registros entre testes com truncateAllTables preservando _prisma_migrations", async () => {
    await prisma.user.create({
      data: {
        name: "Usuária Teste Isolamento",
        email: "isolamento@meninamulher.com",
      },
    });

    const countBefore = await prisma.user.count();
    expect(countBefore).toBe(1);

    await truncateAllTables();

    const countAfter = await prisma.user.count();
    expect(countAfter).toBe(0);

    const migrationsCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations"
    `;
    expect(Number(migrationsCount[0].count)).toBeGreaterThan(0);
  });
});
