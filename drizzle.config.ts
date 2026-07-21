import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for database commands");
if (!process.env.DATABASE_ENVIRONMENT || !["development", "production"].includes(process.env.DATABASE_ENVIRONMENT)) {
  throw new Error("DATABASE_ENVIRONMENT must explicitly be development or production");
}
if (process.env.APP_ENV && process.env.APP_ENV !== process.env.DATABASE_ENVIRONMENT) {
  throw new Error("APP_ENV and DATABASE_ENVIRONMENT must match; refusing to migrate the wrong database");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
});
