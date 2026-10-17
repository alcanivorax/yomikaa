// Removes everything the e2e suite may have created, restoring the seeded
// state (12 sample notes). Run directly: `node scripts/clean-mutable.mjs`.
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../dist/generated/prisma/client.js";

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../.env") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

await prisma.note.deleteMany({ where: { isSample: false } });
await prisma.tag.deleteMany({ where: { notes: { none: {} } } });
await prisma.journalDay.deleteMany({});
await prisma.ticket.deleteMany({});
await prisma.draft.deleteMany({});
await prisma.$disconnect();

console.log("cleaned mutable data");
