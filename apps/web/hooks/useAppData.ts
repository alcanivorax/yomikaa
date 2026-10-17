"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  hasDay,
  today,
  type Draft,
  type Journal,
  type JournalDay,
  type JournalDayInput,
  type Note,
  type Ticket,
} from "@yomikaa/shared";
import { api, clearDevToken, hasDevToken, type Stats } from "@/lib/api";
import { useAutosave, type SaveState } from "@/hooks/useAutosave";
import type { NoteLike } from "@/lib/app-context";

export interface AppData {
  isOwner: boolean;
  authReady: boolean;
  signOut: () => void;

  notes: NoteLike[];
  stats: Stats;
  journal: Journal;
  monthCounts: Record<string, number>;
  tickets: Ticket[];
  draft: Draft | null;

  createNote: (input: Omit<Note, "id">) => Promise<NoteLike>;
  updateNote: (id: number, patch: Partial<Omit<Note, "id">>) => Promise<NoteLike>;
  saveDraft: (d: Draft | null) => void;
  setDay: (date: string, day: JournalDay | null) => void;
  setTickets: (list: Ticket[]) => void;
  ensureMonth: (ym: string) => void;
  ensureYear: (year: string) => void;

  saveState: { draft: SaveState; journal: SaveState; tickets: SaveState };
}

const countDays = (journal: Journal, ym: string): number =>
  Object.entries(journal).filter(([k, d]) => k.startsWith(ym) && hasDay(d))
    .length;

export function useAppData(initialNotes: NoteLike[] | null): AppData {
  const qc = useQueryClient();
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.auth.getSession();
        if (!cancelled) setIsOwner(!!data.session);
        const { data: sub } = sb.auth.onAuthStateChange((_e, s) =>
          setIsOwner(!!s),
        );
        unsub = () => sub.subscription.unsubscribe();
      } else if (!cancelled) {
        setIsOwner(hasDevToken());
      }
      if (!cancelled) setAuthReady(true);
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const notesQ = useQuery({
    queryKey: ["notes"],
    queryFn: api.listNotes,
    initialData: initialNotes ?? undefined,
    staleTime: 30_000,
  });
  const statsQ = useQuery({ queryKey: ["stats"], queryFn: api.stats });
  const draftQ = useQuery({
    queryKey: ["draft"],
    queryFn: api.getDraft,
    enabled: isOwner,
  });
  const ticketsQ = useQuery({
    queryKey: ["tickets"],
    queryFn: api.listTickets,
    enabled: isOwner,
  });

  const notes = useMemo<NoteLike[]>(() => notesQ.data ?? [], [notesQ.data]);
  const stats: Stats = statsQ.data ?? { notes: notes.length };

  /* ── journal: client aggregate of fetched months ───────────── */
  const [journal, setJournal] = useState<Journal>({});
  const [monthCounts, setMonthCounts] = useState<Record<string, number>>({});
  const journalRef = useRef(journal);
  journalRef.current = journal;
  const loadedMonths = useRef(new Set<string>());
  const loadedYears = useRef(new Set<string>());

  const ensureMonth = useCallback((ym: string) => {
    if (loadedMonths.current.has(ym)) return;
    loadedMonths.current.add(ym);
    api
      .journalMonth(ym)
      .then(({ days }) => setJournal((prev) => ({ ...prev, ...days })))
      .catch(() => loadedMonths.current.delete(ym));
  }, []);

  const ensureYear = useCallback((year: string) => {
    if (loadedYears.current.has(year)) return;
    loadedYears.current.add(year);
    api
      .journalYearCounts(year)
      .then((counts) => setMonthCounts((prev) => ({ ...prev, ...counts })))
      .catch(() => loadedYears.current.delete(year));
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    const d = today();
    ensureYear(d.slice(0, 4));
    ensureMonth(d.slice(0, 7));
  }, [isOwner, ensureMonth, ensureYear]);

  const commitJournal = useCallback((date: string, day: JournalDay | null) => {
    const next = { ...journalRef.current };
    if (day) next[date] = day;
    else delete next[date];
    journalRef.current = next;
    setJournal(next);
    const ym = date.slice(0, 7);
    setMonthCounts((c) => ({ ...c, [ym]: countDays(next, ym) }));
  }, []);

  const daySave = useAutosave<{ date: string; day: JournalDayInput }>({
    delay: 0,
    save: async ({ date, day }) => {
      const res = await api.putJournalDay(date, day);
      commitJournal(date, res.life.length || res.work.length ? res : null);
    },
  });

  const setDay = useCallback(
    (date: string, day: JournalDay | null) => {
      commitJournal(date, day);
      daySave.queue({
        date,
        day: day ? { life: day.life, work: day.work } : { life: [], work: [] },
      });
    },
    [commitJournal, daySave],
  );

  /* ── draft ──────────────────────────────────────────────────── */
  const draftSave = useAutosave<Draft | null>({
    delay: 0,
    save: async (d) => {
      if (d) await api.putDraft(d);
      else await api.deleteDraft();
    },
  });

  const saveDraft = useCallback(
    (d: Draft | null) => {
      qc.setQueryData(["draft"], d);
      draftSave.queue(d);
    },
    [qc, draftSave],
  );

  /* ── tickets ────────────────────────────────────────────────── */
  const ticketsSave = useAutosave<Ticket[]>({
    delay: 0,
    save: async (list) => {
      const server = (qc.getQueryData(["tickets"]) as Ticket[] | undefined) ?? [];
      const ids = new Set(list.map((t) => t.id));
      for (const t of list) {
        await api.putTicket(t.id, {
          key: t.key,
          title: t.title,
          status: t.status,
          date: t.date,
          note: t.note,
        });
      }
      for (const s of server) {
        if (!ids.has(s.id)) await api.deleteTicket(s.id);
      }
      qc.setQueryData(["tickets"], list);
    },
  });

  const setTickets = useCallback(
    (list: Ticket[]) => ticketsSave.queue(list),
    [ticketsSave],
  );

  /* ── notes mutations ────────────────────────────────────────── */
  const refresh = useCallback(
    () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["notes"] }),
        qc.invalidateQueries({ queryKey: ["stats"] }),
      ]),
    [qc],
  );

  const createNote = useCallback(
    async (input: Omit<Note, "id">): Promise<NoteLike> => {
      const created = await api.createNote({
        title: input.title,
        kind: input.kind,
        tags: input.tags,
        date: input.date,
        body: input.body ?? [],
        m: input.m ?? "",
        url: input.url ?? "",
      });
      await refresh();
      return created;
    },
    [refresh],
  );

  const updateNote = useCallback(
    async (id: number, patch: Partial<Omit<Note, "id">>): Promise<NoteLike> => {
      const updated = await api.updateNote(id, {
        title: patch.title ?? "",
        kind: patch.kind ?? "Note",
        tags: patch.tags ?? [],
        body: patch.body ?? [],
        m: patch.m ?? "",
        url: patch.url ?? "",
      });
      await refresh();
      return updated;
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    const { getSupabase } = await import("@/lib/supabase");
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    else clearDevToken();
    qc.clear();
    router.push("/");
    router.refresh();
  }, [qc, router]);

  return {
    isOwner,
    authReady,
    signOut,
    notes,
    stats,
    journal,
    monthCounts,
    tickets: ticketsQ.data ?? [],
    draft: draftQ.data ?? null,
    createNote,
    updateNote,
    saveDraft,
    setDay,
    setTickets,
    ensureMonth,
    ensureYear,
    saveState: {
      draft: draftSave.state,
      journal: daySave.state,
      tickets: ticketsSave.state,
    },
  };
}
