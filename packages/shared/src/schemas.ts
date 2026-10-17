import { z } from "zod";

export const kindSchema = z.enum(["Essay", "Snippet", "Note", "Link"]);
export const ticketStatusSchema = z.enum([
  "todo",
  "prog",
  "rev",
  "block",
  "done",
]);

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d\d-\d\d$/, "Expected a YYYY-MM-DD date");

export const timeSchema = z
  .string()
  .regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM or an empty string");

export const entrySchema = z.strictObject({
  from: timeSchema,
  to: timeSchema,
  text: z.string().max(5000),
});

export const journalDaySchema = z.strictObject({
  life: z.array(entrySchema),
  work: z.array(entrySchema),
});

export const noteCreateSchema = z.strictObject({
  title: z.string().max(500),
  kind: kindSchema,
  tags: z.array(z.string().max(64)).max(50),
  date: dateKeySchema,
  body: z.array(z.string().max(20000)).max(500),
  m: z.string().max(1000).optional(),
  url: z.string().max(2048).optional(),
});

export const notePatchSchema = noteCreateSchema.omit({ date: true });

export const ticketSchema = z.strictObject({
  id: z.uuid(),
  key: z.string().max(100),
  title: z.string().max(1000),
  status: ticketStatusSchema,
  date: dateKeySchema,
  note: z.string().max(10000),
});

export const draftSchema = z.strictObject({
  id: z.number().int().nullable(),
  title: z.string().max(500),
  kind: kindSchema,
  tags: z.array(z.string().max(64)).max(50),
  body: z.string().max(100000),
  m: z.string().max(1000),
  url: z.string().max(2048),
});

export const noteDtoSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  kind: kindSchema,
  ex: z.string(),
  tags: z.array(z.string()),
  date: dateKeySchema,
  body: z.array(z.string()).optional(),
  m: z.string().optional(),
  url: z.string().optional(),
  sample: z.boolean(),
});

export const tagDtoSchema = z.object({
  slug: z.string(),
  count: z.number().int(),
});

export type EntryInput = z.infer<typeof entrySchema>;
export type JournalDayInput = z.infer<typeof journalDaySchema>;
export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NotePatchInput = z.infer<typeof notePatchSchema>;
export type TicketInput = z.infer<typeof ticketSchema>;
export type DraftInput = z.infer<typeof draftSchema>;
export type NoteDto = z.infer<typeof noteDtoSchema>;
export type TagDto = z.infer<typeof tagDtoSchema>;
