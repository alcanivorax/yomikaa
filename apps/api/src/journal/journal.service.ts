import { Injectable } from "@nestjs/common";
import {
  sortPart,
  usedEntry,
  type JournalDay,
  type JournalDayInput,
  type JournalEntry,
} from "@yomikaa/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toDate, toKey } from "../common/dates";

interface EntryRow {
  part: string;
  position: number;
  startTime: string;
  endTime: string;
  text: string;
}
interface DayRow {
  date: Date;
  entries: EntryRow[];
}

const toEntry = (e: EntryRow): JournalEntry => ({
  from: e.startTime,
  to: e.endTime,
  text: e.text,
});

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  private group(row: DayRow): JournalDay {
    const life = row.entries
      .filter((e) => e.part === "life")
      .sort((a, b) => a.position - b.position)
      .map(toEntry);
    const work = row.entries
      .filter((e) => e.part === "work")
      .sort((a, b) => a.position - b.position)
      .map(toEntry);
    return { life, work };
  }

  async month(ownerId: string, ym: string): Promise<{ days: Record<string, JournalDay> }> {
    const start = toDate(`${ym}-01`);
    const [year, month] = ym.split("-").map(Number);
    const end = new Date(Date.UTC(year, month, 1));

    const rows = (await this.prisma.journalDay.findMany({
      where: { ownerId, date: { gte: start, lt: end } },
      include: { entries: true },
      orderBy: { date: "asc" },
    })) as unknown as DayRow[];

    const days: Record<string, JournalDay> = {};
    for (const row of rows) days[toKey(row.date)] = this.group(row);
    return { days };
  }

  async yearCounts(ownerId: string, year: string): Promise<Record<string, number>> {
    const y = Number(year);
    const rows = (await this.prisma.journalDay.findMany({
      where: {
        ownerId,
        date: { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) },
      },
      include: { entries: true },
    })) as unknown as DayRow[];

    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (row.entries.length === 0) continue;
      const ym = toKey(row.date).slice(0, 7);
      counts[ym] = (counts[ym] ?? 0) + 1;
    }
    return counts;
  }

  async day(ownerId: string, date: string): Promise<JournalDay> {
    const row = (await this.prisma.journalDay.findUnique({
      where: { ownerId_date: { ownerId, date: toDate(date) } },
      include: { entries: true },
    })) as unknown as DayRow | null;
    return row ? this.group(row) : { life: [], work: [] };
  }

  async putDay(
    ownerId: string,
    date: string,
    input: JournalDayInput,
  ): Promise<JournalDay> {
    const life = sortPart(input.life.filter(usedEntry));
    const work = sortPart(input.work.filter(usedEntry));
    const key = toDate(date);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.journalDay.findUnique({
        where: { ownerId_date: { ownerId, date: key } },
      });

      if (life.length === 0 && work.length === 0) {
        if (existing) await tx.journalDay.delete({ where: { id: existing.id } });
        return;
      }

      const day = await tx.journalDay.upsert({
        where: { ownerId_date: { ownerId, date: key } },
        create: { ownerId, date: key },
        update: {},
      });
      await tx.journalEntry.deleteMany({ where: { dayId: day.id } });
      await tx.journalEntry.createMany({
        data: [
          ...life.map((e, i) => ({
            dayId: day.id,
            part: "life" as const,
            position: i,
            startTime: e.from,
            endTime: e.to,
            text: e.text,
          })),
          ...work.map((e, i) => ({
            dayId: day.id,
            part: "work" as const,
            position: i,
            startTime: e.from,
            endTime: e.to,
            text: e.text,
          })),
        ],
      });
    });

    return { life, work };
  }
}
