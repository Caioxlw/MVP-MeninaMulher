import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma";

/**
 * Extrai o nome do banco de dados a partir de uma URL de conexão PostgreSQL.
 */
export function extractDatabaseName(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    return parsed.pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

/**
 * Trava de segurança: garante que a URL de conexão aponte exclusivamente
 * para um banco de testes terminado com o sufixo `_test`.
 */
export function assertTestDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new Error(
      "SEGURANÇA: DATABASE_URL não definida para execução dos testes. Abortando para proteger o banco de dados."
    );
  }

  const dbName = extractDatabaseName(databaseUrl);
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `SEGURANÇA: A DATABASE_URL de testes deve apontar obrigatoriamente para um banco terminado em '_test' (banco detectado: '${dbName || "inválido"}'). Execução abortada para proteger o banco de desenvolvimento/produção.`
    );
  }

  return databaseUrl;
}

/**
 * Converte uma URL de banco de desenvolvimento para o banco equivalente `_test`,
 * preservando usuário, senha, host, porta e query params locais.
 */
export function toTestDatabaseUrl(baseDatabaseUrl: string): string {
  const parsed = new URL(baseDatabaseUrl);
  const currentDb = parsed.pathname.replace(/^\//, "");
  const testDb = currentDb.endsWith("_test") ? currentDb : `${currentDb}_test`;
  parsed.pathname = `/${testDb}`;
  return parsed.toString();
}

/**
 * Resolve e valida a DATABASE_URL para o ambiente de testes:
 * 1. Se DATABASE_URL já estiver definida no ambiente com sufixo `_test` (ex: CI), utiliza-a.
 * 2. Se existir `backend/.env` local, deriva o banco `*_test` mantendo as credenciais locais.
 * 3. Caso contrário, carrega `backend/.env.test`.
 */
export function resolveTestDatabaseUrl(): string {
  const backendRoot = path.resolve(__dirname, "../../..");
  const envTestPath = path.join(backendRoot, ".env.test");
  const envLocalPath = path.join(backendRoot, ".env");

  const currentEnvUrl = process.env.DATABASE_URL;
  if (currentEnvUrl && extractDatabaseName(currentEnvUrl).endsWith("_test")) {
    return assertTestDatabaseUrl(currentEnvUrl);
  }

  if (fs.existsSync(envLocalPath)) {
    const parsedLocal = dotenv.parse(fs.readFileSync(envLocalPath));
    if (parsedLocal.DATABASE_URL) {
      const derivedUrl = toTestDatabaseUrl(parsedLocal.DATABASE_URL);
      return assertTestDatabaseUrl(derivedUrl);
    }
  }

  if (fs.existsSync(envTestPath)) {
    const parsedTest = dotenv.parse(fs.readFileSync(envTestPath));
    if (parsedTest.DATABASE_URL) {
      return assertTestDatabaseUrl(parsedTest.DATABASE_URL);
    }
  }

  return assertTestDatabaseUrl(currentEnvUrl);
}

/**
 * Limpa todas as tabelas públicas (exceto `_prisma_migrations`) usando TRUNCATE ... RESTART IDENTITY CASCADE.
 * Possui trava de segurança que impede execução fora de bancos `*_test`.
 */
export async function truncateAllTables(client: PrismaClient = prisma): Promise<void> {
  assertTestDatabaseUrl(process.env.DATABASE_URL);

  const tables = await client.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) {
    return;
  }

  const quotedTableNames = tables
    .map((t) => `"public"."${t.tablename.replace(/"/g, '""')}"`)
    .join(", ");

  await client.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTableNames} RESTART IDENTITY CASCADE;`);
}
