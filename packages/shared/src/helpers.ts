import type {
  JournalDay,
  JournalEntry,
  Note,
  SortKey,
  Ticket,
  TicketStatus,
} from "./types";
import { TICKET_LABELS } from "./types";

export const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD. Never uses UTC. */
export const key = (d: Date): string => d.toLocaleDateString("en-CA");

export const today = (): string => key(new Date());

/** "2026-09-28" -> "Sep 28" */
export const fmt = (d: string): string =>
  new Date(d + "T00:00").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });

/** "2026-09-28" -> "September 28, 2026" */
export const fmtFull = (d: string): string =>
  new Date(d + "T00:00").toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const slug = (t: string): string =>
  t
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const allTags = (notes: Note[]): string[] =>
  [...new Set(notes.flatMap((n) => n.tags))].sort();

/** Every whitespace-separated word of q must be a substring of the haystack. */
export const matchQ = (n: Note, q: string): boolean => {
  const hay = (
    n.title +
    " " +
    n.ex +
    " " +
    n.tags.join(" ") +
    " " +
    (n.body || []).join(" ")
  ).toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
};

export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"]/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    };
    return map[c];
  });

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Escape first, then wrap each query word in <mark> (case-insensitive). */
export const hl = (t: string, q: string): string => {
  const w = q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegex);
  return w.length
    ? esc(t).replace(new RegExp("(" + w.join("|") + ")", "gi"), "<mark>$1</mark>")
    : esc(t);
};

/** 140 characters plus "..." only when the joined text was longer (see 08). */
export const excerpt = (paras: string[], url = ""): string => {
  const flat = paras.join(" ");
  const src = flat || url;
  return src.slice(0, 140) + (flat.length > 140 ? "..." : "");
};

export const readingMinutes = (paras: string[]): number => {
  const words = paras.join(" ").split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
};

/** All notes sorted by date ascending then id ascending. */
export const chronology = (notes: Note[]): Note[] =>
  [...notes].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id,
  );

export const chronologyNumber = (notes: Note[], id: number): string => {
  const ch = chronology(notes);
  return pad2(ch.findIndex((n) => n.id === id) + 1);
};

export const sortNotes = (notes: Note[], sort: SortKey): Note[] =>
  [...notes].sort((a, b) => {
    if (sort === "az") return a.title.localeCompare(b.title);
    if (sort === "old") return a.date.localeCompare(b.date) || a.id - b.id;
    return b.date.localeCompare(a.date) || b.id - a.id;
  });

/** Monday-first leading blanks for the first day of a "YYYY-MM" month. */
export const calendarLead = (ym: string): number => {
  const first = new Date(ym + "-01T00:00");
  return (first.getDay() + 6) % 7;
};

export const daysInMonth = (ym: string): number => {
  const first = new Date(ym + "-01T00:00");
  return new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
};

/** Shift a day key by s days; never moves past cap (defaults to today). */
export const shiftDay = (
  jd: string,
  s: number,
  cap: string = today(),
): string => {
  if (s === 0) return cap;
  const d = new Date(jd + "T00:00");
  d.setDate(d.getDate() + s);
  const k = key(d);
  return k <= cap ? k : jd;
};

/** Shift a month key by s months; never moves past capYm (defaults to this month). */
export const shiftMonth = (
  jm: string,
  s: number,
  capYm: string = today().slice(0, 7),
): string => {
  const d = new Date(jm + "-01T00:00");
  d.setMonth(d.getMonth() + s);
  const m = key(d).slice(0, 7);
  return m <= capYm ? m : jm;
};


/* ── Journal time math ─────────────────────────────────────── */

export const toMin = (t: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
  return m ? +m[1] * 60 + +m[2] : null;
};

/** An end before the start means the entry crossed midnight. */
export const spanMin = (e: { from: string; to: string }): number => {
  const a = toMin(e.from);
  const b = toMin(e.to);
  if (a === null || b === null) return 0;
  let d = b - a;
  if (d < 0) d += 1440;
  return d;
};

export const fmtDur = (m: number): string => {
  if (m <= 0) return "";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
};

export const partMin = (list: { from: string; to: string }[]): number =>
  list.reduce((s, e) => s + spanMin(e), 0);

/** An entry counts when it has text, or when both times are set. */
export const usedEntry = (e: JournalEntry): boolean =>
  !!(e.text.trim() || (e.from && e.to));

export const blankEntry = (): JournalEntry => ({ from: "", to: "", text: "" });

/** Legacy journal migration: strings become a single entry; arrays are kept. */
export const normPart = (p: unknown): JournalEntry[] => {
  if (Array.isArray(p)) {
    return p.map((e) => {
      const r = (e || {}) as Partial<JournalEntry>;
      return {
        from: (r.from as string) || "",
        to: (r.to as string) || "",
        text: String(r.text || ""),
      };
    });
  }
  if (typeof p === "string" && p.trim()) {
    return [{ from: "", to: "", text: p }];
  }
  return [];
};

export const normDay = (d: unknown): JournalDay => {
  const r = (d || {}) as { life?: unknown; work?: unknown };
  return { life: normPart(r.life), work: normPart(r.work) };
};

export const hasDay = (d: JournalDay | undefined | null): boolean =>
  !!d && ((d.life || []).length > 0 || (d.work || []).length > 0);

/** Stable sort by start time; entries without a valid start sink to the end. */
export const sortPart = (list: JournalEntry[]): JournalEntry[] => {
  const ix = new Map(list.map((e, i) => [e, i]));
  return [...list].sort((a, b) => {
    const x = toMin(a.from);
    const y = toMin(b.from);
    if (x === null && y === null) return (ix.get(a) as number) - (ix.get(b) as number);
    if (x === null) return 1;
    if (y === null) return -1;
    return x - y || (ix.get(a) as number) - (ix.get(b) as number);
  });
};

/* ── Tickets ──────────────────────────────────────────────── */

export const normTicketStatus = (s: unknown): TicketStatus =>
  typeof s === "string" && s in TICKET_LABELS ? (s as TicketStatus) : "todo";

/** A ticket counts when its key, title or note is non-empty. */
export const usedTicket = (t: Ticket): boolean =>
  !!(t.key.trim() || t.title.trim() || t.note.trim());

/** "2026-09-28" and a real date. */
export const isDateKey = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d\d-\d\d$/.test(s);

export const normTicket = (t: Partial<Ticket>, uid: () => string): Ticket => ({
  id: typeof t.id === "string" && t.id ? t.id : uid(),
  key: String(t.key ?? ""),
  title: String(t.title ?? ""),
  status: normTicketStatus(t.status),
  date: isDateKey(t.date) ? t.date : today(),
  note: String(t.note ?? ""),
});

export const newTicketId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ── Note write helpers ───────────────────────────────────── */

export const fileError = (v: {
  title: string;
  body: string;
  kind: string;
  url: string;
}): { field: "title" | "body" | "url"; message: string } | null => {
  if (!v.title.trim())
    return { field: "title", message: "Give it a title first." };
  if (!v.body.trim() && !(v.kind === "Link" && v.url.trim()))
    return { field: "body", message: "Write something first." };
  if (v.kind === "Link" && !/^https?:\/\//i.test(v.url.trim()))
    return {
      field: "url",
      message: "A link needs a full address, starting with http.",
    };
  return null;
};

export const wordCount = (body: string): number =>
  body.trim() ? body.trim().split(/\s+/).length : 0;

export const buildNote = (v: {
  title: string;
  kind: "Essay" | "Snippet" | "Note" | "Link";
  tags: string[];
  date: string;
  body: string;
  m: string;
  url: string;
}): Omit<Note, "id"> => {
  const paras = v.body
    .trim()
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const flat = paras.join(" ");
  return {
    title: v.title.trim() || "Untitled",
    kind: v.kind,
    tags: v.tags.slice(),
    date: v.date,
    body: paras,
    m: v.m.trim() || undefined,
    url: v.kind === "Link" ? v.url.trim() || undefined : undefined,
    ex: (flat || (v.kind === "Link" ? v.url.trim() : "")).slice(0, 140) +
      (flat.length > 140 ? "..." : ""),
  };
};
