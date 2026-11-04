import { resolveTestDatabaseUrl } from "../helpers/test-db";

// Garante que NODE_ENV e DATABASE_URL apontem para o banco de testes (_test)
// antes que qualquer módulo da aplicação (como server.ts ou prisma.ts) seja carregado.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = resolveTestDatabaseUrl();
