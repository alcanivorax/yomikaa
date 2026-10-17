"use client";

import { useEffect, type RefObject } from "react";
import type { View } from "@/lib/view";

export function computeFX(): boolean {
  if (typeof window === "undefined") return false;
  return (
    matchMedia("(hover:hover) and (pointer:fine)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const HOVERS =
  "a, button, .row, .item, .cd, .me, .pill, select, [data-go], [data-random], [data-open], [data-close]";

interface Options {
  cursor: RefObject<HTMLDivElement | null>;
  peek: RefObject<HTMLDivElement | null>;
  orb: RefObject<HTMLDivElement | null>;
  viewRef: RefObject<View>;
  resolvePeek: (id: number) => { k: string; p: string } | null;
}

/**
 * Custom cursor, Home peek card and hero orb (02-shell-and-motion.md 5-7).
 * One requestAnimationFrame loop eases all three. Enabled only for fine
 * pointers without reduced motion.
 */
export function useCursor({ cursor, peek, orb, viewRef, resolvePeek }: Options) {
  useEffect(() => {
    if (!computeFX()) return;
    const cur = cursor.current;
    const peekEl = peek.current;
    const orbEl = orb.current;
    if (!cur || !peekEl) return;
    const root = document.documentElement;
    root.classList.add("has-cur");
    cur.hidden = false;

    let mx = innerWidth / 2;
    let my = innerHeight / 2;
    let cx = mx;
    let cy = my;
    let px = mx + 26;
    let py = my + 26;
    let pr = 0;
    let ps = 0.92;
    let shown = false;
    let ox = 0;
    let oy = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("input, textarea")) {
        cur.classList.add("txt");
        cur.classList.remove("hov");
        return;
      }
      cur.classList.remove("txt");
      cur.classList.toggle("hov", !!t.closest(HOVERS));
    };

    let recent: Element | null = null;
    const onPointerOver = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const row = t.closest(".row") as HTMLElement | null;
      if (row && row.closest("#recent") && row.dataset.id) {
        const data = resolvePeek(Number(row.dataset.id));
        if (data) {
          const k = peekEl.querySelector(".k") as HTMLElement | null;
          const p = peekEl.querySelector("p") as HTMLElement | null;
          if (k) k.innerHTML = data.k;
          if (p) p.innerHTML = data.p;
          shown = true;
          peekEl.classList.add("on");
        }
      } else if (recent && !t.closest("#recent")) {
        shown = false;
        peekEl.classList.remove("on");
      }
    };

    const onPointerLeaveRecent = () => {
      shown = false;
      peekEl.classList.remove("on");
    };

    const tick = () => {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      cur.style.transform = `translate3d(${cx}px,${cy}px,0)`;

      const tx = Math.min(mx + 26, innerWidth - 324);
      const ty = Math.min(my + 26, innerHeight - 190);
      px += (tx - px) * 0.14;
      py += (ty - py) * 0.14;
      const rTarget = Math.max(-9, Math.min(9, (tx - px) * 0.12));
      pr += (rTarget - pr) * 0.2;
      ps += ((shown ? 1 : 0.92) - ps) * 0.2;
      peekEl.style.transform = `translate3d(${px}px,${py}px,0) rotate(${pr}deg) scale(${ps})`;

      if (orbEl) {
        const home = viewRef.current === "home";
        const dx = ((mx - innerWidth / 2) * 0.08 - ox) * 0.05;
        const dy = ((my - innerHeight / 2) * 0.08 - oy) * 0.05;
        ox += home ? dx : -ox * 0.05;
        oy += home ? dy : -oy * 0.05;
        orbEl.style.transform = `translate3d(${ox}px,${oy}px,0)`;
      }

      raf = requestAnimationFrame(tick);
    };

    recent = document.getElementById("recent");
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerleave", onPointerOver, { passive: true });
    recent?.addEventListener("pointerleave", onPointerLeaveRecent);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("has-cur");
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerleave", onPointerOver);
      recent?.removeEventListener("pointerleave", onPointerLeaveRecent);
    };
  }, [cursor, peek, orb, viewRef, resolvePeek]);
}
