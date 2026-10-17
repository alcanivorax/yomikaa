"use client";

import { useCallback, useEffect, useRef } from "react";

/** One IntersectionObserver at threshold .12; revealAll re-arms every .rv in a root. */
export function useReveal() {
  const io = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    io.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("vis");
            io.current?.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    return () => io.current?.disconnect();
  }, []);

  const revealAll = useCallback((root: HTMLElement | null) => {
    if (!root || !io.current) return;
    root.querySelectorAll(".rv").forEach((el) => {
      el.classList.remove("vis");
      io.current!.observe(el);
    });
  }, []);

  return revealAll;
}
