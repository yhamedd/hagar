import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type Database = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __hagarPostgresqlPool?: Pool;
  __hagarPostgresqlDb?: Database;
};

type AppEnvironment = "development" | "production";

function expectedEnvironment(): AppEnvironment {
  return process.env.REPLIT_DEPLOYMENT === "1"
    ? "production"
    : process.env.NODE_ENV === "development" || process.env.APP_ENV === "development"
      ? "development"
      : "production";
}

function databaseConfig() {
  const expected = expectedEnvironment();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. This app always reads and writes through PostgreSQL; there is no local/demo fallback.");
  }

  const declared = process.env.DATABASE_ENVIRONMENT;
  if (declared !== expected) {
    throw new Error(`DATABASE_ENVIRONMENT must be ${expected}; refusing to connect to a differently scoped database.`);
  }
  return { databaseUrl, expected };
}

function getDb() {
  if (globalForDb.__hagarPostgresqlDb) return globalForDb.__hagarPostgresqlDb;
  const config = databaseConfig();
  const pool = globalForDb.__hagarPostgresqlPool ?? new Pool({ connectionString: config.databaseUrl, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000, application_name: `hagar-booking-${config.expected}` });
  const database = drizzle(pool);
  globalForDb.__hagarPostgresqlPool = pool;
  globalForDb.__hagarPostgresqlDb = database;
  return database;
}

// Lazy initialization keeps builds safe before deployment variables are injected.
// (db is only ever imported by server-side route handlers and server-only lib
// modules; Next.js never bundles this into client JS, so DATABASE_URL never
// reaches the browser.)
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDb();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
