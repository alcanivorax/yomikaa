"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { hl } from "@yomikaa/shared";
import {
  AppCtx,
  type AppValue,
  type NoteLike,
  type IndexState,
  type ShelfTarget,
} from "@/lib/app-context";
import { VIEW_LABEL, VIEW_PATH, viewFromPath, type View } from "@/lib/view";
import { useReveal } from "@/hooks/useReveal";
import { useCursor } from "@/hooks/useCursor";
import { useAppData } from "@/hooks/useAppData";
import { Reader } from "@/components/Reader";
import { HomeView } from "@/components/views/HomeView";
import { IndexView } from "@/components/views/IndexView";
import { WriteView } from "@/components/views/WriteView";
import { JournalView } from "@/components/views/JournalView";
import { TicketsView } from "@/components/views/TicketsView";

const RM =
  typeof window !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const OWNER_VIEWS: View[] = ["write", "journal", "tickets"];

interface ShellProps {
  initialView: View;
  initialNotes: NoteLike[] | null;
  initialNote?: number | null;
}

export function Shell({ initialView, initialNotes, initialNote = null }: ShellProps) {
  const [cur, setCur] = useState<View>(initialView);
  const [reader, setReader] = useState({
    open: initialNote != null,
    id: initialNote ?? 0,
    temp: null as NoteLike | null,
  });
  const [index, setIndexState] = useState<IndexState>({
    q: "",
    kind: "All",
    tag: null,
    sort: "new",
  });

  const data = useAppData(initialNotes);
  const {
    isOwner,
    authReady,
    notes,
    journal,
    monthCounts,
    tickets,
    draft,
    stats,
    createNote,
    updateNote,
    saveDraft,
    setDay,
    setTickets,
    ensureMonth,
    ensureYear,
    saveState,
    signOut,
  } = data;

  const curtain = useRef<HTMLDivElement | null>(null);
  const curtainLabel = useRef<HTMLSpanElement | null>(null);
  const cursor = useRef<HTMLDivElement | null>(null);
  const peek = useRef<HTMLDivElement | null>(null);
  const orb = useRef<HTMLDivElement | null>(null);
  const clock = useRef<HTMLSpanElement | null>(null);
  const busy = useRef(false);
  const curRef = useRef<View>(cur);
  const origin = useRef<[number, number]>([0, 0]);
  const trigger = useRef<Element | null>(null);
  const revealAll = useReveal();

  useEffect(() => {
    curRef.current = cur;
  }, [cur]);

  const swap = useCallback(
    (v: View) => {
      setCur(v);
      curRef.current = v;
      window.scrollTo(0, 0);
      const section = document.getElementById(v);
      requestAnimationFrame(() => revealAll(section));
      const f = v === "search" ? "#q2" : v === "write" ? "#wt" : null;
      if (f) {
        setTimeout(
          () => (document.querySelector(f) as HTMLElement | null)?.focus({ preventScroll: true }),
          RM ? 0 : 900,
        );
      }
    },
    [revealAll],
  );

  const go = useCallback(
    (v: View) => {
      if (busy.current) return;
      if (v === curRef.current) {
        window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" });
        return;
      }
      if (RM) {
        const c = curtain.current;
        if (c) c.getAnimations().forEach((a) => a.cancel());
        history.pushState({ view: v }, "", VIEW_PATH[v]);
        swap(v);
        return;
      }
      busy.current = true;
      const c = curtain.current;
      if (!c) return;
      if (curtainLabel.current) curtainLabel.current.textContent = VIEW_LABEL[v];
      c.animate(
        [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }],
        { duration: 560, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" },
      ).finished
        .then(() => {
          history.pushState({ view: v }, "", VIEW_PATH[v]);
          swap(v);
          return c.animate(
            [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }],
            {
              duration: 680,
              delay: 140,
              easing: "cubic-bezier(.7,0,.2,1)",
              fill: "forwards",
            },
          ).finished;
        })
        .then(() => {
          busy.current = false;
          c.getAnimations().forEach((a) => a.cancel());
        });
    },
    [swap],
  );

  /* clock */
  useEffect(() => {
    const tick = () => {
      if (!clock.current) return;
      const d = new Date();
      clock.current.textContent =
        d.toLocaleDateString("en", { weekday: "short" }) +
        " · " +
        d.toLocaleTimeString("en", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);

  /* reader origin tracking (capture phase) */
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      origin.current = [e.clientX, e.clientY];
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, []);

  /* back and forward run the same curtain */
  useEffect(() => {
    const onPop = () => {
      const m = /^\/n\/(\d+)$/.exec(window.location.pathname);
      if (m) {
        setReader({ open: true, id: Number(m[1]), temp: null });
        return;
      }
      setReader((r) => (r.open ? { ...r, open: false } : r));
      const v = viewFromPath(window.location.pathname);
      if (v !== curRef.current) {
        if (RM) swap(v);
        else goRef.current(v);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [swap]);

  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  }, [go]);

  /* visitors never reach owner-only views (see 11 §3 / DEVIATIONS) */
  useEffect(() => {
    if (!authReady || isOwner) return;
    if (OWNER_VIEWS.includes(curRef.current)) {
      history.replaceState({ view: "home" }, "", VIEW_PATH.home);
      swap("home");
    }
  }, [authReady, isOwner, swap]);

  const openNote = useCallback((id: number, temp: NoteLike | null = null) => {
    trigger.current = document.activeElement;
    setReader({ open: true, id, temp });
    if (!temp && id >= 0)
      history.pushState(
        { note: id, view: curRef.current },
        "",
        `/n/${id}`,
      );
  }, []);

  const closeInstant = useCallback(() => {
    setReader((r) => (r.open ? { ...r, open: false } : r));
  }, []);

  const closeNote = useCallback(() => {
    const st = window.history.state as { note?: number } | null;
    if (window.location.pathname.startsWith("/n/") && st?.note != null)
      history.back();
    else {
      history.replaceState({ view: curRef.current }, "", VIEW_PATH[curRef.current]);
      setReader((r) => ({ ...r, open: false }));
    }
  }, []);

  const setIndex = useCallback((patch: Partial<IndexState>) => {
    setIndexState((prev) => ({ ...prev, ...patch }));
  }, []);

  const toSearch = useCallback(
    (target?: ShelfTarget) => {
      closeInstant();
      if (target) {
        setIndexState((prev) => ({
          ...prev,
          kind: "All",
          tag: null,
          q: "",
          ...target,
        }));
      }
      if (curRef.current === "search") {
        window.scrollTo(0, 0);
      } else {
        go("search");
      }
    },
    [closeInstant, go],
  );

  const openSearch = useCallback(
    (target: ShelfTarget) => toSearch(target),
    [toSearch],
  );

  useEffect(() => {
    const onShelf = (e: Event) =>
      toSearch({ tag: (e as CustomEvent<string>).detail, kind: "All", q: "" });
    const onSearch = (e: Event) =>
      toSearch({ q: (e as CustomEvent<string>).detail, tag: null, kind: "All" });
    window.addEventListener("mg:shelf", onShelf);
    window.addEventListener("mg:search", onSearch);
    return () => {
      window.removeEventListener("mg:shelf", onShelf);
      window.removeEventListener("mg:search", onSearch);
    };
  }, [toSearch]);

  const value = useMemo<AppValue>(
    () => ({
      cur,
      go,
      revealAll,
      isOwner,
      authReady,
      signOut,
      notes,
      journal,
      monthCounts,
      tickets,
      draft,
      stats,
      index,
      setIndex,
      openSearch,
      createNote,
      updateNote,
      saveDraft,
      setDay,
      setTickets,
      ensureMonth,
      ensureYear,
      saveState,
      reader,
      openNote,
      closeNote,
      closeInstant,
    }),
    [
      cur,
      go,
      revealAll,
      isOwner,
      authReady,
      signOut,
      notes,
      journal,
      monthCounts,
      tickets,
      draft,
      stats,
      index,
      setIndex,
      openSearch,
      createNote,
      updateNote,
      saveDraft,
      setDay,
      setTickets,
      ensureMonth,
      ensureYear,
      saveState,
      reader,
      openNote,
      closeNote,
      closeInstant,
    ],
  );

  /* cross-view click delegation */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!(t instanceof Element)) return;
      const g = t.closest("[data-go]");
      if (g) {
        closeInstant();
        go((g as HTMLElement).dataset.go as View);
        return;
      }
      const sh = t.closest("[data-shelf]");
      if (sh) {
        window.dispatchEvent(
          new CustomEvent("mg:shelf", {
            detail: (sh as HTMLElement).dataset.shelf,
          }),
        );
        return;
      }
      const o = t.closest("[data-open]");
      if (o) return openNote(Number((o as HTMLElement).dataset.open));
      const it = t.closest(".item") as HTMLElement | null;
      if (it) return openNote(Number(it.dataset.id));
      if (t.closest("[data-close]")) return value.closeNote();
      const ed = t.closest("[data-edit]");
      if (ed) {
        value.closeInstant();
        window.dispatchEvent(
          new CustomEvent("mg:edit", {
            detail: Number((ed as HTMLElement).dataset.edit),
          }),
        );
        return;
      }
      if (t.closest("[data-random]")) {
        if (!notes.length) return;
        return openNote(notes[Math.floor(Math.random() * notes.length)].id);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [go, closeInstant, openNote, value, notes]);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const inField = /INPUT|TEXTAREA/.test(active?.tagName ?? "");
      if (e.key === "Enter" && !inField) {
        const el = (e.target as Element).closest?.(".row,.item") as HTMLElement | null;
        if (el) {
          const r = el.getBoundingClientRect();
          origin.current = [r.left + r.width / 2, r.top + r.height / 2];
          el.click();
        }
      }
      if (e.key === "/" && !inField && !value.reader.open) {
        e.preventDefault();
        if (curRef.current === "home")
          (document.getElementById("q1") as HTMLElement | null)?.focus();
        else if (curRef.current === "search")
          (document.getElementById("q2") as HTMLElement | null)?.focus();
        else go("search");
      }
      if (e.key === "Escape") {
        if (value.reader.open) value.closeNote();
        else active?.blur();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "s" || e.key === "Enter") &&
        curRef.current === "write"
      ) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("mg:file"));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, value]);

  const resolvePeek = useCallback(
    (id: number) => {
      const n = notes.find((x) => x.id === id);
      if (!n) return null;
      return {
        k: `${n.kind} · ${new Date(n.date + "T00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}`,
        p: hl(n.ex, ""),
      };
    },
    [notes],
  );

  useCursor({ cursor, peek, orb, viewRef: curRef, resolvePeek });

  return (
    <AppCtx.Provider value={value}>
      <div className="curtain" id="curtain" aria-hidden="true" ref={curtain}>
        <span id="cl" ref={curtainLabel}>
          Yomikaa
        </span>
      </div>
      <div className="cur" id="cur" ref={cursor} hidden />
      <div className="peek" id="peek" aria-hidden="true" ref={peek}>
        <div className="k" />
        <p />
      </div>

      <header className="bar">
        <button className="wm" data-go="home" aria-label="Yomikaa, home">
          Yomikaa
        </button>
        <span className="clock" id="clock" ref={clock} />
        <nav aria-label="Primary">
          <button data-go="search">Index</button>
          {isOwner && <button data-go="write">Write</button>}
          {isOwner && <button data-go="journal">Journal</button>}
          {isOwner && <button data-go="tickets">Tickets</button>}
          <button data-random>Random</button>
        </nav>
      </header>

      <main>
        <HomeView />
        <IndexView />
        <WriteView />
        <JournalView />
        <TicketsView />
      </main>

      <Reader origin={origin} trigger={trigger} />
    </AppCtx.Provider>
  );
}
