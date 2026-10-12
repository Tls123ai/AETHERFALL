
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

const databaseUrl = process.env.DATABASE_URL;

export const pool = databaseUrl
  ? globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    })
  : null;

if (pool && process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = pool ? drizzle(pool) : null;

export function getDb() {
  if (!db) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return db;
}
