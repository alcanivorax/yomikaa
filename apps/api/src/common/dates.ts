/** "YYYY-MM-DD" -> Date at UTC midnight (matches Postgres `date`). */
export const toDate = (key: string): Date => new Date(key + "T00:00:00.000Z");

/** Prisma `date` value -> "YYYY-MM-DD". */
export const toKey = (date: Date): string => date.toISOString().slice(0, 10);
