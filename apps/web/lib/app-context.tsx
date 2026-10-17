"use client";

import { createContext, useContext } from "react";
import type {
  Draft,
  Journal,
  JournalDay,
  Note,
  SortKey,
  Ticket,
} from "@marginalia/shared";
import type { View } from "./view";

export type NoteLike = Omit<Note, "id"> & { id: number };

export interface IndexState {
  q: string;
  kind: "All" | string;
  tag: string | null;
  sort: SortKey;
}

export interface ShelfTarget {
  q?: string;
  tag?: string | null;
  kind?: "All" | string;
}

export interface ReaderState {
  open: boolean;
  id: number;
  temp: NoteLike | null;
}

export interface AppValue {
  cur: View;
  go: (v: View) => void;
  revealAll: (el: HTMLElement | null) => void;

  notes: Note[];
  journal: Journal;
  tickets: Ticket[];
  draft: Draft | null;
  stats: { notes: number; journalDays?: number };

  index: IndexState;
  setIndex: (patch: Partial<IndexState>) => void;
  openSearch: (target: ShelfTarget) => void;

  createNote: (input: Omit<Note, "id">) => number;
  updateNote: (id: number, patch: Partial<Omit<Note, "id">>) => void;
  saveDraft: (d: Draft | null) => void;
  setDay: (date: string, day: JournalDay | null) => void;
  setTicket: (t: Ticket) => void;
  removeTicket: (id: string) => void;

  reader: ReaderState;
  openNote: (id: number, temp?: NoteLike | null) => void;
  closeNote: () => void;
  closeInstant: () => void;
}

export const AppCtx = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useApp must be used within AppContext");
  return v;
}
