import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { SAMPLE_NOTES, slug } from "@yomikaa/shared";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const existing = await prisma.note.count({ where: { isSample: true } });
  if (existing > 0) {
    console.log(`Sample notes already present (${existing}); skipping.`);
    return;
  }

  for (const n of SAMPLE_NOTES) {
    const slugs = [...new Set(n.tags.map(slug).filter(Boolean))];
    await prisma.note.create({
      data: {
        title: n.title,
        kind: n.kind,
        excerpt: n.ex,
        body: n.body ?? [],
        margin: n.m ?? null,
        url: n.url ?? null,
        date: new Date(n.date + "T00:00:00.000Z"),
        isSample: true,
        tags: {
          connectOrCreate: slugs.map((s) => ({
            where: { slug: s },
            create: { slug: s },
          })),
        },
      },
    });
  }

  console.log(`Seeded ${SAMPLE_NOTES.length} sample notes.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
