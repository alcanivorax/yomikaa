import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations run against the direct (non-pooled) connection; the runtime
// PrismaClient connects through the pooled DATABASE_URL via a driver adapter.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
