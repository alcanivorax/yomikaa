export type Kind = "Essay" | "Snippet" | "Note" | "Link";
export const KINDS: readonly Kind[] = ["Essay", "Snippet", "Note", "Link"];

export interface Note {
  id: number;
  title: string;
  kind: Kind;
  tags: string[];
  date: string;
  ex: string;
  body?: string[];
  m?: string;
  url?: string;
}

export interface JournalEntry {
  from: string;
  to: string;
  text: string;
}

export interface JournalDay {
  life: JournalEntry[];
  work: JournalEntry[];
}

export type Journal = Record<string, JournalDay>;

export type TicketStatus = "todo" | "prog" | "rev" | "block" | "done";

export interface Ticket {
  id: string;
  key: string;
  title: string;
  status: TicketStatus;
  date: string;
  note: string;
}

export interface Draft {
  id: number | null;
  title: string;
  kind: Kind;
  tags: string[];
  body: string;
  m: string;
  url: string;
}

export type SortKey = "new" | "old" | "az";

export interface IndexState {
  q: string;
  kind: "All" | Kind;
  tag: string | null;
  sort: SortKey;
}

export const TICKET_STATUSES: readonly { value: TicketStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "prog", label: "In progress" },
  { value: "rev", label: "In review" },
  { value: "block", label: "Blocked" },
  { value: "done", label: "Done" },
];

export const TICKET_LABELS: Record<TicketStatus, string> = Object.fromEntries(
  TICKET_STATUSES.map((s) => [s.value, s.label]),
) as Record<TicketStatus, string>;
