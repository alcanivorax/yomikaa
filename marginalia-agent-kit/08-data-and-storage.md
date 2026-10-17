# 08 Data and storage

Reference: the top of the `<script>` (`store`, `SEED`, `X`, `D`, helper functions) and each view's save code.

The reference build keeps everything in the browser's `localStorage`; the sections below define the **data shapes, sample content and rules**, which are unchanged. In the real project the data lives in Supabase Postgres through Prisma and a NestJS API (`11-stack-and-backend.md`): sections 2 (storage keys) and the journal migration note describe the reference only; the types, the 12 sample notes, helper behavior and rules apply to both. Never let persistence change how anything looks.

## 1. Types

```ts
type Kind = "Essay" | "Snippet" | "Note" | "Link";

interface Note {
  id: number;            // position in the notes array; samples are 0 to 11, user notes continue from 12
  title: string;
  kind: Kind;
  tags: string[];        // slugs: lowercase a-z, 0-9, hyphens
  date: string;          // "YYYY-MM-DD", local time
  ex: string;            // excerpt, at most 140 chars plus "..." when cut
  body?: string[];       // paragraphs; when absent the reader shows [ex]
  m?: string;            // one margin note
  url?: string;          // Link notes only; http(s)
}

interface JournalEntry { from: string; to: string; text: string; }   // from and to are "HH:MM" (24-hour) or ""
interface JournalDay { life: JournalEntry[]; work: JournalEntry[]; }
type Journal = Record<string /* "YYYY-MM-DD" */, JournalDay>;

type TicketStatus = "todo" | "prog" | "rev" | "block" | "done";
interface Ticket { id: string; key: string; title: string; status: TicketStatus; date: string /* "YYYY-MM-DD" */; note: string; }

interface Draft { id: number | null; title: string; kind: Kind; tags: string[]; body: string; m: string; url: string; }
```

## 2. Storage

Four keys. Every read and write is wrapped in `try/catch` and the app must keep working (in memory only) if storage is blocked, full, or throws (private windows, preview frames).

| Key | Value | Written by |
|---|---|---|
| `mg.notes` | `Omit<Note, "id">[]` containing only notes written in Write (never the 12 samples), in creation order | File it |
| `mg.draft` | `Draft` or removed | Write autosave (700ms debounce); removed by File it and Start over |
| `mg.journal` | `Journal` | Journal autosave (600ms debounce) |
| `mg.tickets` | `Ticket[]` (only used tickets, newest added first) | Tickets autosave (500ms debounce) |

```ts
const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
};
```
**Journal migration:** earlier builds stored each day as `{ life: string, work: string }`. Always read the journal through a normalizer: a non-empty string becomes one entry `{from:"",to:"",text:string}`, an empty or missing value becomes `[]`, an array is kept with each entry's fields coerced to strings. **Tickets** are read through `normT` (non-arrays become `[]`, unknown status becomes `todo`, bad date becomes today, missing id is generated). Details in `07` and `10`.

(`mg.draft` is cleared with `store.set("mg.draft", null)`, which stores the string `null`; reading it back yields `null`, which the loader treats as no draft.)

Load order: the notes array is the 12 samples followed by `mg.notes`, with each user note's `id` set to its array index.

## 3. The 12 sample notes (exact content)

Use this data verbatim. Notes whose `body` is listed show those paragraphs in the reader; the others show only their excerpt. `m` is the margin note.

```json
[
  {
    "id": 0,
    "title": "The case for boring infrastructure",
    "kind": "Essay",
    "tags": [
      "engineering",
      "opinion"
    ],
    "date": "2026-09-28",
    "ex": "Notes on why the least exciting stack usually ships the most. Postgres, a queue, and patience.",
    "body": [
      "Every project I have regretted started with something exciting. Every project I'm proud of started with Postgres, one queue, and a cron job.",
      "Boring tools have boring failure modes, and boring failure modes are the ones you've already read about. That is most of the argument."
    ],
    "m": "remember this at 2am"
  },
  {
    "id": 1,
    "title": "Binary search, off-by-one cheatsheet",
    "kind": "Snippet",
    "tags": [
      "algorithms",
      "interview"
    ],
    "date": "2026-09-24",
    "ex": "The three loop invariants I actually trust, and how to pick the right bounds every time.",
    "body": [
      "Pick the invariant first: the answer always lives inside [lo, hi].",
      "While lo < hi, take mid = lo + (hi - lo) / 2. Too small, lo = mid + 1. Otherwise hi = mid. Never mix the two styles."
    ],
    "m": "lo < hi, not <="
  },
  {
    "id": 2,
    "title": "On keeping a commonplace book",
    "kind": "Essay",
    "tags": [
      "writing",
      "habits"
    ],
    "date": "2026-09-19",
    "ex": "Why copying other people's sentences by hand changed how I read."
  },
  {
    "id": 3,
    "title": "Debounce, throttle, and when each one lies",
    "kind": "Snippet",
    "tags": [
      "javascript",
      "engineering"
    ],
    "date": "2026-09-12",
    "ex": "Small implementations plus the bug each one hides in production."
  },
  {
    "id": 4,
    "title": "System design: rate limiter",
    "kind": "Note",
    "tags": [
      "interview",
      "systems"
    ],
    "date": "2026-09-05",
    "ex": "Token bucket versus sliding window, with the numbers I use to justify the choice.",
    "body": [
      "Token bucket: cheap, allows bursts, easy to explain. Sliding window: smoother, but costs memory per user.",
      "Default to token bucket unless the product promises a strict per-minute limit."
    ],
    "m": "ask about bursts first"
  },
  {
    "id": 5,
    "title": "A good reading list on typography",
    "kind": "Link",
    "tags": [
      "design",
      "writing"
    ],
    "date": "2026-08-30",
    "ex": "Books and articles I return to, annotated with one line each.",
    "body": [
      "Bringhurst for the rules. Butterick for the shortcuts. A long afternoon with any good specimen book for the taste."
    ],
    "m": "reread"
  },
  {
    "id": 6,
    "title": "Easing curves worth memorizing",
    "kind": "Note",
    "tags": [
      "design",
      "animation"
    ],
    "date": "2026-08-22",
    "ex": "Four curves that cover almost every interface motion I have needed."
  },
  {
    "id": 7,
    "title": "Notes on Designing Data-Intensive Applications",
    "kind": "Note",
    "tags": [
      "systems",
      "books"
    ],
    "date": "2026-08-14",
    "ex": "Chapter by chapter, only the parts I had to reread."
  },
  {
    "id": 8,
    "title": "Git commands I keep forgetting",
    "kind": "Snippet",
    "tags": [
      "tools",
      "engineering"
    ],
    "date": "2026-08-03",
    "ex": "Reflog, bisect, worktree, and the one-liner to undo a bad rebase."
  },
  {
    "id": 9,
    "title": "Why paper feels fast",
    "kind": "Essay",
    "tags": [
      "design",
      "opinion"
    ],
    "date": "2026-07-27",
    "ex": "A short argument about latency, texture, and the absence of loading states.",
    "body": [
      "A pen has no loading state. The mark appears where the hand is, at the speed of the hand.",
      "I think that is what fast means: no gap between the thought and its trace. Most software puts an interface in that gap."
    ],
    "m": "is this the whole point?"
  },
  {
    "id": 10,
    "title": "Dynamic programming patterns, grouped",
    "kind": "Note",
    "tags": [
      "algorithms",
      "interview"
    ],
    "date": "2026-07-18",
    "ex": "Knapsack, intervals, grids, strings. The shape of each state and its transition."
  },
  {
    "id": 11,
    "title": "Morning pages, month three",
    "kind": "Essay",
    "tags": [
      "habits",
      "writing"
    ],
    "date": "2026-07-09",
    "ex": "What changed, what did not, and the format I settled on."
  }
]
```

Derived values for sanity checks: 12 notes; 12 distinct shelves (`algorithms, animation, books, design, engineering, habits, interview, javascript, opinion, systems, tools, writing`); kinds present: Essay (4), Snippet (3), Note (4), Link (1). Newest note is "The case for boring infrastructure" (2026-09-28); oldest is "Morning pages, month three" (2026-07-09).

## 4. Helper functions (exact behavior)

```ts
const pad2 = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => d.toLocaleDateString("en-CA");           // YYYY-MM-DD in LOCAL time. Never toISOString.
const today = () => key(new Date());
const fmt = (d: string) => new Date(d + "T00:00").toLocaleDateString("en", { month: "short", day: "numeric" }); // "Sep 28"
const slug = (t: string) => t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const allTags = () => [...new Set(notes.flatMap(n => n.tags))].sort();
const matchQ = (n: Note, q: string) => {
  const hay = (n.title + " " + n.ex + " " + n.tags.join(" ") + " " + (n.body || []).join(" ")).toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
};
const esc = (s: unknown) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as const)[c as "&"]);
```

- Highlight: escape first, then wrap matches of each query word (regex-escaped, case-insensitive, global) with `<mark>`. Never insert user text as HTML without escaping.
- Excerpt: `paragraphs.join(" ")` (or the URL if there is no body), `slice(0,140)`, plus `...` only when the joined text was longer than 140.
- Reading time: `Math.max(1, Math.round(wordCount / 200))` minutes.
- Chronological order: sort by `date` ascending then `id` ascending. A note's number is its 1-based position, zero-padded to 2.
- "Recently filed": sort by `date` descending then `id` descending, take 6.
- Day navigation uses `new Date(key + "T00:00")` and `setDate`, `setMonth` on local dates, and never crosses into the future.

## 5. Derived UI data (where each number comes from)

| UI | Source |
|---|---|
| Home eyebrow count, footer "N notes filed" | `notes.length` |
| Footer "N days journaled" | number of journal days where `life` or `work` has at least one stored entry |
| Marquee and shelf counts | tags across all notes, count per tag |
| Index count numeral | length of the filtered list |
| Hero match line | notes matching the typed words (ignores kind and shelf) |
| Journal month chip counts | days in that month with at least one entry |
| Journal "N days written" | days with at least one entry across all months |
| Journal part total (`.tot`) | count of used entries, and summed duration of entries that have both times |
| Tickets pill counts and footer count | used tickets, per status (All counts everything used) |

## 6. Rules about the data

- Sample notes are read-only. No delete anywhere. No import or export.
- Journal and ticket data are never read by Home (apart from the journaled-days count), Index, Reader, Random, or any search.
- A journal entry is **used** (saved and counted) when it has text, or when both `from` and `to` are set. An end time earlier than the start means the entry crossed midnight (add 24 hours). Overlaps are allowed.
- A ticket is **used** when its key, title or note is non-empty.
- Only `http://` and `https://` URLs are ever rendered as links, always with `target="_blank" rel="noopener noreferrer"`.
- Days with no used entries are removed from storage, not stored as blanks. Unused rows (blank drafts, a lone start time) are dropped on save.

## 7. Test data to seed manually

To exercise every state, create these in Write: one note of each kind (the Link with `https://example.com`), one with a margin note, one with a 3-paragraph body, one with a very long title (80+ characters), one with 6 tags. In Journal, write entries on at least three different days across two months including a day with only Life and a day with only Work; on one day add three Work entries with chained times (09:00 to 10:30, 10:30 to 12:00, 22:00 to 01:30 for the midnight case) plus one row with only a start time (it must not be saved); also load a day stored in the old plain-text shape. In Tickets, create one ticket per status, one with a 90-character title, one with no notes, one with a multi-line note, and one done ticket dated yesterday.

## 8. Real persistence

See `11-stack-and-backend.md` for the Prisma schema (Note, Tag, JournalDay, JournalEntry, Ticket, Draft), the API contract, authentication and the web data layer. The 12 sample notes in section 3 become the Prisma seed. The legacy plain-text journal migration in section 2 does not apply to the database (there is no old data there).
