"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface SaveOptions {
  keepalive?: boolean;
}

interface Options<T> {
  delay: number;
  save: (value: T, opts: SaveOptions) => Promise<void>;
}

/**
 * Reference-compatible autosave (see 11 §5):
 * - debounce `delay` ms after the last change;
 * - one request in flight per resource, later changes coalesce to the latest;
 * - on failure keep the value, show `error`, retry with backoff 1s,2s,4s…30s;
 * - flush on pagehide/visibilitychange with `keepalive`, warn on beforeunload.
 */
export function useAutosave<T>({ delay, save }: Options<T>) {
  const [state, setState] = useState<SaveState>("idle");

  const pending = useRef<T | undefined>(undefined);
  const hasPending = useRef(false);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retry = useRef(0);
  const saveRef = useRef(save);
  saveRef.current = save;

  const run = useCallback(async (opts: SaveOptions = {}) => {
    if (inFlight.current || !hasPending.current) return;
    const value = pending.current as T;
    hasPending.current = false;
    inFlight.current = true;
    setState("saving");
    try {
      await saveRef.current(value, opts);
      inFlight.current = false;
      retry.current = 0;
      setState("saved");
      if (hasPending.current) void run();
    } catch {
      inFlight.current = false;
      if (!hasPending.current) {
        pending.current = value;
        hasPending.current = true;
      }
      setState("error");
      const wait = Math.min(30_000, 1000 * 2 ** retry.current);
      retry.current += 1;
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => void run(), wait);
    }
  }, []);

  const queue = useCallback(
    (value: T) => {
      pending.current = value;
      hasPending.current = true;
      retry.current = 0;
      clearTimeout(retryTimer.current);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void run(), delay);
    },
    [delay, run],
  );

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (hasPending.current) void run({ keepalive: true });
  }, [run]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPending.current || inFlight.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimeout(timer.current);
      clearTimeout(retryTimer.current);
    };
  }, [flush]);

  return { queue, flush, state };
}
