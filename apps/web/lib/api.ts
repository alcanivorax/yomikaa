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

export const DEV_TOKEN_COOKIE = "mg_dev_token";

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
  // Browser: same-origin /api/v1, rewritten to the api service by vercel.json.
  // In plain local dev NEXT_PUBLIC_API_URL points at the API directly.
  return process.env.NEXT_PUBLIC_API_URL ?? API_PREFIX;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

async function getToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const { getSupabase } = await import("./supabase");
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (data.session?.access_token) return data.session.access_token;
    }
    return readCookie(DEV_TOKEN_COOKIE);
  }
  return null;
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

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

export function hasDevToken(): boolean {
  return !!readCookie(DEV_TOKEN_COOKIE);
}

export function clearDevToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEV_TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
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

  devToken: (secret: string) =>
    request("/auth/dev-token", z.object({ token: z.string() }), {
      method: "POST",
      body: JSON.stringify({ secret }),
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
