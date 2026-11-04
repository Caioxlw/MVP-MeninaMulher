import { execSync } from "child_process";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  assertTestDatabaseUrl,
  extractDatabaseName,
  resolveTestDatabaseUrl,
} from "../helpers/test-db";

/**
 * Garante que o banco de dados de testes (`*_test`) exista na instância do PostgreSQL
 * antes de aplicar as migrações do Prisma.
 */
async function ensureTestDatabaseExists(testDatabaseUrl: string): Promise<void> {
  const dbName = extractDatabaseName(testDatabaseUrl);
  assertTestDatabaseUrl(testDatabaseUrl);

  const adminUrl = new URL(testDatabaseUrl);
  adminUrl.pathname = "/postgres";

  const adminPrisma = new PrismaClient({
    datasources: {
      db: {
        url: adminUrl.toString(),
      },
    },
  });

  try {
    const existing = await adminPrisma.$queryRaw<Array<{ exists: number }>>`
      SELECT 1 AS exists FROM pg_database WHERE datname = ${dbName}
    `;

    if (existing.length === 0) {
      const safeDbName = dbName.replace(/"/g, '""');
      await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${safeDbName}";`);
    }
  } finally {
    await adminPrisma.$disconnect();
  }
}

export default async function globalSetup(): Promise<void> {
  const testDatabaseUrl = resolveTestDatabaseUrl();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = testDatabaseUrl;

  await ensureTestDatabaseExists(testDatabaseUrl);

  const backendRoot = path.resolve(__dirname, "../../..");
  execSync("npx prisma migrate deploy", {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
    },
    stdio: "pipe",
  });
}
