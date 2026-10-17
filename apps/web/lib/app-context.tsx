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
import type { SaveState } from "@/hooks/useAutosave";
import type { View } from "./view";

export type NoteLike = Note & { sample?: boolean };

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

  isOwner: boolean;
  authReady: boolean;
  signOut: () => void;

  notes: NoteLike[];
  journal: Journal;
  monthCounts: Record<string, number>;
  tickets: Ticket[];
  draft: Draft | null;
  stats: { notes: number; journalDays?: number };

  index: IndexState;
  setIndex: (patch: Partial<IndexState>) => void;
  openSearch: (target: ShelfTarget) => void;

  createNote: (input: Omit<Note, "id">) => Promise<NoteLike>;
  updateNote: (id: number, patch: Partial<Omit<Note, "id">>) => Promise<NoteLike>;
  saveDraft: (d: Draft | null) => void;
  setDay: (date: string, day: JournalDay | null) => void;
  setTickets: (list: Ticket[]) => void;
  ensureMonth: (ym: string) => void;
  ensureYear: (year: string) => void;

  saveState: { draft: SaveState; journal: SaveState; tickets: SaveState };

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
