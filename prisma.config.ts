import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env files on its own. Node's built-in loader keeps
// this dependency-free; `prisma generate` must work without a database (CI, installs).
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations need a direct connection; poolers (PgBouncer) break migrate's locks.
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
