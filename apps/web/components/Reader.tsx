"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  chronology,
  esc,
  pad2,
  readingMinutes,
  type Note,
} from "@marginalia/shared";
import { useApp, type NoteLike } from "@/lib/app-context";

const RM =
  typeof window !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

interface ReaderProps {
  origin: RefObject<[number, number]>;
  trigger: RefObject<Element | null>;
}

function fullDate(date: string): string {
  return new Date(date + "T00:00").toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function Reader({ origin, trigger }: ReaderProps) {
  const { reader, notes, revealAll, closeInstant } = useApp();
  const root = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const rk = useRef<HTMLSpanElement | null>(null);
  const prog = useRef<HTMLDivElement | null>(null);
  const wasOpen = useRef(false);

  const resolve = (): Note | NoteLike | null => {
    if (reader.temp) return reader.temp;
    return notes.find((n) => n.id === reader.id) ?? null;
  };

  /* content */
  useEffect(() => {
    const node = body.current;
    const rootEl = root.current;
    if (!node || !rootEl || !reader.open) return;
    const n = resolve();
    if (!n) return;
    const chrono = chronology(notes);
    const isTemp = !!reader.temp;
    const i = isTemp ? chrono.length : chrono.findIndex((x) => x.id === reader.id);
    const prev = isTemp ? null : chrono[i - 1];
    const next = isTemp ? null : chrono[i + 1];
    const paras = n.body && n.body.length ? n.body : [n.ex];
    const link =
      n.url && /^https?:\/\//i.test(n.url)
        ? `<a class="lk" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">Open the link</a>`
        : "";
    if (rk.current) rk.current.textContent = `${n.kind} · No. ${pad2(i + 1)}`;
    node.innerHTML = `<div class="rd"><aside class="side rv" style="--d:2">
      <dl><dt>Filed</dt><dd>${fullDate(n.date)}</dd></dl><dl><dt>Kind</dt><dd>${n.kind}</dd></dl><dl><dt>Reading</dt><dd>${readingMinutes(paras)} min</dd></dl>
      <dl><dt>Shelves</dt><dd><div class="pills">${n.tags.map((t) => `<button class="pill" data-shelf="${esc(t)}">${esc(t)}</button>`).join("")}</div></dd></dl>
      ${n.m ? `<dl class="marg"><dt>In the margin</dt><dd><p>${esc(n.m)}</p></dd></dl>` : ""}
      ${!isTemp ? `<div><button class="lk" data-edit="${n.id}">Edit this note</button></div>` : ""}</aside>
      <article><h2 class="rt rv" style="--d:1">${esc(n.title)}</h2><div class="rb rv" style="--d:3">${paras.map((p) => `<p>${esc(p)}</p>`).join("")}</div>${link}
      <nav class="pn" aria-label="Neighbouring notes">${prev ? `<button data-open="${prev.id}"><small>Earlier</small><b>${esc(prev.title)}</b></button>` : "<span></span>"}${next ? `<button data-open="${next.id}"><small>Later</small><b>${esc(next.title)}</b></button>` : "<span></span>"}</nav></article></div>`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reader.open, reader.id, reader.temp, notes]);

  /* open / close animation */
  useEffect(() => {
    const rootEl = root.current;
    const progEl = prog.current;
    if (!rootEl) return;
    if (reader.open) {
      rootEl.scrollTop = 0;
      if (wasOpen.current) {
        revealAll(rootEl);
        return;
      }
      wasOpen.current = true;
      const [x, y] = origin.current ?? [innerWidth / 2, innerHeight * 0.9];
      const radius = Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y),
      );
      rootEl.hidden = false;
      rootEl.scrollTop = 0;
      document.body.style.overflow = "hidden";
      if (progEl) progEl.style.transform = "scaleX(0)";
      if (!RM)
        rootEl.animate(
          [
            { clipPath: `circle(0px at ${x}px ${y}px)` },
            { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
          ],
          { duration: 900, easing: "cubic-bezier(.7,0,.2,1)" },
        );
      revealAll(rootEl);
      setTimeout(
        () => (rootEl.querySelector("#rclose") as HTMLElement | null)?.focus({ preventScroll: true }),
        RM ? 0 : 350,
      );
    } else if (wasOpen.current) {
      wasOpen.current = false;
      const [x, y] = origin.current ?? [innerWidth / 2, innerHeight * 0.9];
      const radius = Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y),
      );
      const fin = () => {
        rootEl.hidden = true;
        document.body.style.overflow = "";
        closeInstant();
        const t = trigger.current as HTMLElement | null;
        t?.focus?.({ preventScroll: true });
      };
      if (RM) {
        fin();
        return;
      }
      rootEl
        .animate(
          [
            { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
            { clipPath: `circle(0px at ${x}px ${y}px)` },
          ],
          {
            duration: 700,
            easing: "cubic-bezier(.7,0,.2,1)",
            fill: "forwards",
          },
        )
        .finished.then(() => {
          fin();
          rootEl.getAnimations().forEach((a) => a.cancel());
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reader.open]);

  /* scroll progress */
  useEffect(() => {
    const rootEl = root.current;
    const progEl = prog.current;
    if (!rootEl) return;
    const onScroll = () => {
      const m = rootEl.scrollHeight - rootEl.clientHeight;
      if (progEl)
        progEl.style.transform = `scaleX(${m > 0 ? rootEl.scrollTop / m : 0})`;
    };
    rootEl.addEventListener("scroll", onScroll, { passive: true });
    return () => rootEl.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="reader"
      id="reader"
      ref={root}
      hidden
      role="dialog"
      aria-modal="true"
      aria-label="Note"
    >
      <div className="prog" id="prog" ref={prog} />
      <div className="rtop">
        <span id="rk" ref={rk} />
        <button id="rclose" data-close>
          <span>Close</span>
          <kbd>esc</kbd>
        </button>
      </div>
      <div id="rbody" ref={body} />
    </div>
  );
}
