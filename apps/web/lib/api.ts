import { z } from "zod";
import {
  draftSchema,
  journalDaySchema,
  noteDtoSchema,
  tagDtoSchema,
  ticketSchema,
  type DraftInput,
  type JournalDay,
  type JournalDayInput,
  type NoteDto,
  type TagDto,
  type Ticket,
} from "@yomikaa/shared";

export interface Stats {
  notes: number;
  journalDays?: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const statsSchema = z.object({
  notes: z.number().int(),
  journalDays: z.number().int().optional(),
});

const monthSchema = z.object({
  days: z.record(z.string(), journalDaySchema),
});

const API_PREFIX = "/api/v1";

export function apiBase(): string {
  if (typeof window === "undefined") {
    // Server-side: on Vercel, API_URL is injected by the api service binding
    // (the service's base URL, no path). Locally it comes from .env.local.
    const origin = (process.env.API_URL ?? "http://localhost:4000").replace(
      /\/+$/,
      "",
    );
    return origin + API_PREFIX;
  }
  // Browser: same-origin /api/v1. On Vercel vercel.json rewrites it to the api
  // service; locally next.config.ts proxies it to the API. The session lives in
  // httpOnly cookies, so no Authorization header is needed.
  return API_PREFIX;
}

async function rawFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");

  const res = await fetch(apiBase() + path, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.message ?? res.statusText,
      body?.errors,
    );
  }
  return schema.parse(body);
}

async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/refresh", { method: "POST", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  try {
    return await rawFetch(path, schema, init);
  } catch (e) {
    // On 401 (expired access token), silently refresh once and retry.
    if (
      e instanceof ApiError &&
      e.status === 401 &&
      typeof window !== "undefined"
    ) {
      if (await refreshSession()) {
        return rawFetch(path, schema, init);
      }
    }
    throw e;
  }
}

/** Server-aware session probe used to restore owner UI state on load. */
export async function fetchSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/session", { cache: "no-store" });
    if (!res.ok) return false;
    const body = (await res.json()) as { authenticated?: boolean };
    return body.authenticated === true;
  } catch {
    return false;
  }
}

/** Signs out server-side (clears cookies) and reports success. */
export async function signOutRequest(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/logout", { method: "POST", cache: "no-store" });
  } catch {
    /* ignore — cookies are cleared regardless */
  }
}

export const api = {
  listNotes: () => request("/notes", z.array(noteDtoSchema)),
  getNote: (id: number) => request(`/notes/${id}`, noteDtoSchema),
  createNote: (input: {
    title: string;
    kind: string;
    tags: string[];
    date: string;
    body: string[];
    m?: string;
    url?: string;
  }) =>
    request("/notes", noteDtoSchema, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateNote: (id: number, input: Record<string, unknown>) =>
    request(`/notes/${id}`, noteDtoSchema, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  listTags: () => request("/tags", z.array(tagDtoSchema)),
  stats: () => request("/stats", statsSchema),

  getDraft: () => request("/draft", draftSchema.nullable()),
  putDraft: (draft: DraftInput) =>
    request("/draft", draftSchema, {
      method: "PUT",
      body: JSON.stringify(draft),
    }),
  deleteDraft: () =>
    request("/draft", z.null(), { method: "DELETE" }).catch((e) => {
      if (e instanceof ApiError && e.status === 204) return null;
      throw e;
    }),

  journalMonth: (ym: string) => request(`/journal/months/${ym}`, monthSchema),
  journalYearCounts: (year: string) =>
    request(`/journal/years/${year}/counts`, z.record(z.string(), z.number())),
  journalDay: (date: string) =>
    request(`/journal/days/${date}`, journalDaySchema),
  putJournalDay: (date: string, day: JournalDayInput) =>
    request(`/journal/days/${date}`, journalDaySchema, {
      method: "PUT",
      body: JSON.stringify(day),
    }),

  listTickets: () => request("/tickets", z.array(ticketSchema)),
  putTicket: (id: string, body: Omit<Ticket, "id">) =>
    request(`/tickets/${id}`, ticketSchema.nullable(), {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteTicket: (id: string) =>
    request(`/tickets/${id}`, z.null(), { method: "DELETE" }).catch((e) => {
      if (e instanceof ApiError && e.status === 204) return null;
      throw e;
    }),
};

/** Server-side, public note fetch for the first paint (see 11 §5). */
export async function fetchNotesServer(): Promise<NoteDto[] | null> {
  try {
    const res = await fetch(`${apiBase()}/notes`, { cache: "no-store" });
    if (!res.ok) return null;
    return z.array(noteDtoSchema).parse(await res.json());
  } catch {
    return null;
  }
}

export type { NoteDto, TagDto, JournalDay, Ticket };
