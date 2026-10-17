"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  allTags,
  esc,
  fmt,
  hl,
  matchQ,
  pad2,
  sortNotes,
  type Note,
  type SortKey,
} from "@yomikaa/shared";
import { useApp } from "@/lib/app-context";

const RM =
  typeof window !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

function tween(el: HTMLElement, to: number) {
  const from = Number(el.dataset.v ?? 0);
  el.dataset.v = String(to);
  if (RM || from === to) {
    el.textContent = String(to);
    return;
  }
  const t0 = performance.now();
  const f = (t: number) => {
    const p = Math.min(1, (t - t0) / 600);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(f);
  };
  requestAnimationFrame((t) => f(t));
}

export function IndexView() {
  const { cur, notes, index, setIndex } = useApp();
  const list = useRef<HTMLDivElement | null>(null);
  const empty = useRef<HTMLDivElement | null>(null);
  const num = useRef<HTMLSpanElement | null>(null);
  const prevRects = useRef<Map<number, number>>(new Map());
  const nodes = useRef<Map<number, HTMLAnchorElement>>(new Map());

  const tags = allTags(notes);
  const kinds: string[] = useMemo(
    () => ["All", ...Array.from(new Set(notes.map((n) => n.kind)))],
    [notes],
  );

  const match = (n: Note) =>
    (index.kind === "All" || n.kind === index.kind) &&
    (!index.tag || n.tags.includes(index.tag)) &&
    matchQ(n, index.q);

  const res = useMemo(
    () => sortNotes(notes.filter(match), index.sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes, index.q, index.kind, index.tag, index.sort],
  );
  const keep = useMemo(() => new Set(res.map((n) => n.id)), [res]);
  const ordered = useMemo(
    () => [...res, ...notes.filter((n) => !keep.has(n.id))],
    [res, notes, keep],
  );

  /* FLIP + entry animation (imperative, matches reference render()) */
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    if (!RM) {
      res.forEach((n, i) => {
        const node = nodes.current.get(n.id);
        if (!node) return;
        const now = node.getBoundingClientRect().top;
        const was = prevRects.current.get(n.id);
        const ease = "cubic-bezier(.16,1,.3,1)";
        if (was !== undefined) {
          const dy = was - now;
          if (dy)
            node.animate(
              [{ transform: `translateY(${dy}px)` }, { transform: "none" }],
              { duration: 700, easing: ease },
            );
        } else {
          node.animate(
            [
              { opacity: 0, transform: "translateY(24px)" },
              { opacity: 1, transform: "none" },
            ],
            {
              duration: 800,
              delay: Math.min(i, 8) * 45,
              easing: ease,
              fill: "backwards",
            },
          );
        }
      });
    }
    const after = new Map<number, number>();
    res.forEach((n) => {
      const node = nodes.current.get(n.id);
      if (node) after.set(n.id, node.getBoundingClientRect().top);
    });
    prevRects.current = after;
  }, [res]);

  useLayoutEffect(() => {
    if (num.current) tween(num.current, res.length);
  }, [res.length]);

  useLayoutEffect(() => {
    if (empty.current) empty.current.hidden = res.length > 0;
    if (empty.current) empty.current.textContent = "Nothing filed under that yet.";
  }, [res.length]);

  return (
    <section className={cur === "search" ? "view on" : "view"} id="search">
      <div className="col">
        <div className="shead">
          <div className="fld">
            <label className="lbl" htmlFor="q2">
              Search the archive
            </label>
            <input
              className="megain"
              id="q2"
              type="search"
              placeholder="type anything"
              autoComplete="off"
              value={index.q}
              onInput={(e) => setIndex({ q: e.currentTarget.value })}
            />
          </div>
          <div className="num" aria-live="polite">
            <span id="num" ref={num}>
              {res.length}
            </span>
            <small id="numl">{res.length === 1 ? "entry" : "entries"}</small>
          </div>
        </div>
        <div className="split">
          <aside className="rail">
            <div>
              <h4>Kind</h4>
              <div className="pills" id="kinds">
                {kinds.map((k) => (
                  <button
                    key={k}
                    className="pill"
                    data-k={k}
                    aria-pressed={index.kind === k}
                    onClick={() => setIndex({ kind: k })}
                  >
                    {k === "All" ? "All" : k + "s"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4>Shelf</h4>
              <div className="pills" id="tags">
                {tags.map((t) => (
                  <button
                    key={t}
                    className="pill"
                    data-t={esc(t)}
                    aria-pressed={index.tag === t}
                    onClick={() =>
                      setIndex({ tag: index.tag === t ? null : t })
                    }
                  >
                    {esc(t)}
                  </button>
                ))}
              </div>
            </div>
            <div className="srt" id="sort">
              <h4>Sort</h4>
              {(
                [
                  ["new", "Newest"],
                  ["old", "Oldest"],
                  ["az", "A to Z"],
                ] as [SortKey, string][]
              ).map(([s, label]) => (
                <button
                  key={s}
                  data-s={s}
                  aria-pressed={index.sort === s}
                  onClick={() => setIndex({ sort: s })}
                >
                  {label}
                </button>
              ))}
            </div>
          </aside>
          <div>
            <div id="list" ref={list}>
              {ordered.map((n) => {
                const i = res.findIndex((x) => x.id === n.id);
                const visible = keep.has(n.id);
                return (
                  <a
                    key={n.id}
                    className="item"
                    tabIndex={0}
                    data-id={n.id}
                    ref={(el) => {
                      if (el) nodes.current.set(n.id, el);
                      else nodes.current.delete(n.id);
                    }}
                    style={{ display: visible ? "" : "none" }}
                  >
                    <span className="no">{pad2(i + 1)}</span>
                    <div>
                      <h4
                        className="tt"
                        dangerouslySetInnerHTML={{ __html: hl(n.title, index.q) }}
                      />
                      <p
                        dangerouslySetInnerHTML={{ __html: hl(n.ex, index.q) }}
                      />
                      <div className="tg">
                        {n.tags.map((t) => "#" + esc(t)).join("\u00a0\u00a0")}
                      </div>
                    </div>
                    <span className="mt">
                      {n.kind} · {fmt(n.date)}
                    </span>
                  </a>
                );
              })}
            </div>
            <div className="empty" id="empty" ref={empty} hidden>
              Nothing filed under that yet.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
