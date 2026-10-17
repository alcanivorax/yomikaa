"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  blankEntry,
  daysInMonth,
  esc,
  fmtDur,
  hasDay,
  pad2,
  partMin,
  shiftDay,
  shiftMonth,
  sortPart,
  spanMin,
  today,
  usedEntry,
  type JournalDay,
  type JournalEntry,
} from "@marginalia/shared";
import { useApp } from "@/lib/app-context";

const RM =
  typeof window !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const PARTS: {
  key: "life" | "work";
  label: string;
  ph: string;
  sub: string;
}[] = [
  { key: "life", label: "Life", ph: "What filled this time?", sub: "how the day felt, who you saw" },
  { key: "work", label: "Work", ph: "What did you work on?", sub: "what moved, what stuck, what is next" },
];

const snip = (s: string, n = 110): string => {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "..." : t;
};

const filled = (d: JournalDay | undefined): boolean => hasDay(d);

function copyPart(list: JournalEntry[] | undefined): JournalEntry[] {
  return sortPart((list || []).map((e) => ({ from: e.from, to: e.to, text: e.text })));
}

export function JournalView() {
  const { cur, journal, setDay } = useApp();
  const [jd, setJd] = useState<string>(() => today());
  const [jm, setJm] = useState<string>(() => today().slice(0, 7));
  const [jOpen, setJOpen] = useState(true);
  const [E, setE] = useState<{ life: JournalEntry[]; work: JournalEntry[] }>(() => ({
    life: [blankEntry()],
    work: [blankEntry()],
  }));

  const root = useRef<HTMLElement | null>(null);
  const jsplit = useRef<HTMLDivElement | null>(null);
  const jsaved = useRef<HTMLSpanElement | null>(null);
  const journalRef = useRef(journal);
  const jdRef = useRef(jd);
  const Eref = useRef(E);

  useEffect(() => {
    journalRef.current = journal;
  }, [journal]);
  useEffect(() => {
    jdRef.current = jd;
  }, [jd]);
  useEffect(() => {
    Eref.current = E;
  }, [E]);

  /* collapse the month browser on narrow screens after hydration */
  useEffect(() => {
    setJOpen(window.innerWidth > 900);
  }, []);

  const flashSaved = () => {
    const s = jsaved.current;
    if (!s) return;
    s.style.opacity = "1";
    clearTimeout((s as unknown as { _t?: ReturnType<typeof setTimeout> })._t);
    (s as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => {
        s.style.opacity = "0";
      },
      1300,
    );
  };

  /* autosave */
  const jPend = useRef(false);
  const jt = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const saveDay = useCallback(() => {
    jPend.current = false;
    const e = Eref.current;
    const clean = (p: "life" | "work") =>
      e[p].filter(usedEntry).map((x) => ({ from: x.from, to: x.to, text: x.text }));
    const v = { life: clean("life"), work: clean("work") };
    setDay(jdRef.current, v.life.length || v.work.length ? v : null);
    flashSaved();
  }, [setDay]);

  const saveRef = useRef(saveDay);
  saveRef.current = saveDay;

  const queueSave = useCallback(() => {
    jPend.current = true;
    clearTimeout(jt.current);
    jt.current = setTimeout(() => saveRef.current(), 600);
  }, []);

  const flushSave = useCallback(() => {
    if (jPend.current) {
      clearTimeout(jt.current);
      saveRef.current();
    }
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) flushSave();
    };
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flushSave);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flushSave]);

  /* load the selected day */
  const loadDay = useCallback((date: string) => {
    const d = journalRef.current[date] || { life: [], work: [] };
    const part = (p: "life" | "work") => {
      const l = copyPart(d[p]);
      return l.length ? l : [blankEntry()];
    };
    setE({ life: part("life"), work: part("work") });
  }, []);

  useEffect(() => {
    if (cur === "journal") loadDay(jd);
  }, [cur, jd, loadDay]);

  /* auto-grow every textarea in the section */
  const growAll = () => {
    root.current
      ?.querySelectorAll<HTMLTextAreaElement>(".ent textarea")
      .forEach((t) => {
        t.style.height = "auto";
        t.style.height = t.scrollHeight + 4 + "px";
      });
  };

  useLayoutEffect(() => {
    growAll();
  }, [E, cur]);

  useEffect(() => {
    const onResize = () => {
      if (cur === "journal") growAll();
    };
    window.addEventListener("resize", onResize);
    if (document.fonts) document.fonts.ready.then(() => growAll());
    return () => window.removeEventListener("resize", onResize);
     
  }, [cur]);

  /* focus management for new rows */
  const focusReq = useRef<{ p: "life" | "work"; i: number; field: "from" | "to" } | null>(null);
  useLayoutEffect(() => {
    const f = focusReq.current;
    if (!f) return;
    focusReq.current = null;
    const row = root.current?.querySelector<HTMLElement>(
      `.ent[data-p="${f.p}"][data-i="${f.i}"]`,
    );
    row?.querySelector<HTMLElement>(`[data-f="${f.field}"]`)?.focus();
  }, [E]);

  const addEntry = (p: "life" | "work", after?: number) => {
    setE((prev) => {
      const L = prev[p];
      const prevEnt = L[after === undefined ? L.length - 1 : after];
      const i = after === undefined ? L.length : after + 1;
      const ne: JournalEntry = {
        from: prevEnt && prevEnt.to ? prevEnt.to : "",
        to: "",
        text: "",
      };
      const next = { ...prev, [p]: [...L.slice(0, i), ne, ...L.slice(i)] };
      focusReq.current = { p, i, field: ne.from ? "to" : "from" };
      return next;
    });
    queueSave();
  };

  const removeEntry = (p: "life" | "work", i: number) => {
    setE((prev) => {
      const L = prev[p].filter((_, x) => x !== i);
      if (!L.length) L.push(blankEntry());
      return { ...prev, [p]: L };
    });
    queueSave();
  };

  const setEnt = (
    p: "life" | "work",
    i: number,
    field: keyof JournalEntry,
    v: string,
  ) => {
    setE((prev) => {
      const L = prev[p].slice();
      L[i] = { ...L[i], [field]: v };
      return { ...prev, [p]: L };
    });
    queueSave();
  };

  const onEntKey = (e: ReactKeyboardEvent<HTMLTextAreaElement>, p: "life" | "work") => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    const i = Number((e.currentTarget.closest(".ent") as HTMLElement).dataset.i);
    if (!E[p][i].text.trim()) return;
    e.preventDefault();
    addEntry(p, i);
  };

  const onListBlur = (e: ReactFocusEvent<HTMLDivElement>, p: "life" | "work") => {
    const box = e.currentTarget;
    if (box.contains(e.relatedTarget as Node | null)) return;
    const sorted = sortPart(E[p]);
    if (sorted.some((x, i) => x !== E[p][i])) {
      setE((prev) => ({ ...prev, [p]: sorted }));
      queueSave();
    }
  };

  /* navigation */
  const stepDay = (s: number) => {
    flushSave();
    setJd((prev) => shiftDay(prev, s));
  };

  const pickDay = (k: string) => {
    flushSave();
    setJd(k);
    setJm(k.slice(0, 7));
    setTimeout(
      () =>
        jsplit.current?.scrollIntoView({
          behavior: RM ? "auto" : "smooth",
          block: "start",
        }),
      0,
    );
  };

  const stepMonth = (s: number) => {
    setJm((prev) => shiftMonth(prev, s));
  };

  /* derived: month browser */
  const tdy = today();
  const tm = tdy.slice(0, 7);
  const year = jm.slice(0, 4);
  const monthName = (m: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(m + "-01T00:00").toLocaleDateString("en", opts);

  const monthKeys = Object.keys(journal)
    .filter((k) => k.startsWith(jm) && filled(journal[k]))
    .sort()
    .reverse();

  const lead = (() => {
    const first = new Date(jm + "-01T00:00");
    return (first.getDay() + 6) % 7;
  })();
  const dim = daysInMonth(jm);

  const dayCount = Object.values(journal).filter(filled).length;
  const dateObj = new Date(jd + "T00:00");

  const prevDisabled = jd >= tdy;
  const todayDisabled = jd === tdy;

  return (
    <section className={cur === "journal" ? "view on" : "view"} id="journal" ref={root}>
      <div className="col jh">
        <div className="jtop">
          <h2 className="jdate" id="jdate">
            {dateObj.toLocaleDateString("en", { weekday: "long" })},
            <em>
              {dateObj.toLocaleDateString("en", { month: "long", day: "numeric" })}
            </em>
          </h2>
          <div className="steps">
            <button data-step="-1" onClick={() => stepDay(-1)}>
              Earlier
            </button>
            <button
              data-step="0"
              id="jtoday"
              disabled={todayDisabled}
              onClick={() => stepDay(0)}
            >
              Today
            </button>
            <button
              data-step="1"
              id="jnext"
              disabled={prevDisabled}
              onClick={() => stepDay(1)}
            >
              Later
            </button>
          </div>
        </div>
        <div className="jb">
          <div className="jbh">
            <div className="jm">
              <button
                className="ar"
                data-mstep="-1"
                aria-label="Previous month"
                onClick={() => stepMonth(-1)}
              >
                ‹
              </button>
              <button
                className="mlabel"
                id="jmlabel"
                data-mtoggle=""
                aria-expanded={jOpen}
                aria-controls="jbody"
                onClick={() => setJOpen((o) => !o)}
              >
                {monthName(jm, { month: "long", year: "numeric" })}
              </button>
              <button
                className="ar"
                data-mstep="1"
                id="jmnext"
                aria-label="Next month"
                disabled={jm >= tm}
                onClick={() => stepMonth(1)}
              >
                ›
              </button>
            </div>
            <div
              className="months"
              id="jmonths"
              role="group"
              aria-label="Months of this year"
              hidden={!jOpen}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const m = year + "-" + pad2(i + 1);
                const c = Object.keys(journal).filter(
                  (k) => k.startsWith(m) && filled(journal[k]),
                ).length;
                return (
                  <button
                    key={m}
                    className="pill"
                    data-m={m}
                    aria-pressed={m === jm}
                    disabled={m > tm}
                    onClick={() => setJm(m)}
                  >
                    {monthName(m, { month: "short" })}
                    {c ? <sup>{c}</sup> : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="jbody" id="jbody" hidden={!jOpen}>
            <div className="cal" id="jcal">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span className="wd" key={`wd${i}`}>
                  {d}
                </span>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <span key={`lead${i}`} />
              ))}
              {Array.from({ length: dim }, (_, idx) => {
                const d = idx + 1;
                const k = jm + "-" + pad2(d);
                const e = journal[k] || { life: [], work: [] };
                return (
                  <button
                    key={k}
                    className={"cd" + (k === tdy ? " td" : "")}
                    data-day={k}
                    aria-pressed={k === jd}
                    disabled={k > tdy}
                    aria-label={`${new Date(k + "T00:00").toLocaleDateString("en", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}${filled(e) ? ", has an entry" : ""}`}
                    onClick={() => pickDay(k)}
                  >
                    <span>{d}</span>
                    <i>
                      <b className={e.life.length ? "f" : ""} />
                      <b className={e.work.length ? "f" : ""} />
                    </i>
                  </button>
                );
              })}
            </div>
            <div className="ml" id="jmlist">
              <h5>
                {monthKeys.length
                  ? `${monthKeys.length} ${monthKeys.length === 1 ? "day" : "days"} written in ${monthName(
                      jm,
                      { month: "long" },
                    )}`
                  : ""}
              </h5>
              {monthKeys.length ? (
                monthKeys.map((k) => {
                  const e = journal[k];
                  const d = new Date(k + "T00:00");
                  return (
                    <button key={k} className="me" data-day={k} onClick={() => pickDay(k)}>
                      <span className="dy">
                        {d.toLocaleDateString("en", { weekday: "short" })} {d.getDate()}
                      </span>
                      <span>
                        {(["life", "work"] as const).map((p) => {
                          const list = e[p];
                          if (!list.length) return null;
                          const m = partMin(list);
                          const t = list
                            .map((x) => x.text.trim())
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <span className="pp" key={p}>
                              <b>{p === "life" ? "Life" : "Work"}</b>
                              {m ? esc(fmtDur(m)) + (t ? " · " : "") : ""}
                              {esc(snip(t))}
                            </span>
                          );
                        })}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="jmempty">
                  Nothing written in {monthName(jm, { month: "long" })} yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="jsplit" ref={jsplit}>
        {PARTS.map((part) => {
          const list = E[part.key];
          const n = list.filter(usedEntry).length;
          const m = partMin(list);
          const tot = n
            ? `${n} ${n === 1 ? "entry" : "entries"}${m ? " · " + fmtDur(m) : ""}`
            : "";
          return (
            <div className={`jp ${part.key}`} key={part.key}>
              <div className="jph">
                <h3>{part.label}</h3>
                <span className="tot" id={part.key === "life" ? "jlt" : "jwt"}>
                  {tot}
                </span>
              </div>
              <div className="sub">{part.sub}</div>
              <div
                className="ents"
                id={part.key === "life" ? "jl" : "jw"}
                role="list"
                aria-label={`${part.label} entries`}
                onBlur={(e) => onListBlur(e, part.key)}
              >
                {list.map((e, i) => (
                  <div
                    className="ent"
                    role="listitem"
                    data-p={part.key}
                    data-i={i}
                    key={i}
                  >
                    <div className="rng">
                      <input
                        className="tm"
                        type="time"
                        data-f="from"
                        value={e.from}
                        aria-label="From time"
                        onChange={(ev) => setEnt(part.key, i, "from", ev.currentTarget.value)}
                      />
                      <span className="to" aria-hidden="true">
                        to
                      </span>
                      <input
                        className="tm"
                        type="time"
                        data-f="to"
                        value={e.to}
                        aria-label="To time"
                        onChange={(ev) => setEnt(part.key, i, "to", ev.currentTarget.value)}
                      />
                      <span className="dur">{fmtDur(spanMin(e))}</span>
                    </div>
                    <button
                      className="rmv"
                      data-erm={i}
                      data-p={part.key}
                      aria-label="Remove this entry"
                      onClick={() => removeEntry(part.key, i)}
                    >
                      <span className="rt">Remove</span>
                      <span className="rx" aria-hidden="true">
                        &times;
                      </span>
                    </button>
                    <textarea
                      data-f="text"
                      rows={1}
                      placeholder={part.ph}
                      aria-label="What happened"
                      value={e.text}
                      onChange={(ev) => setEnt(part.key, i, "text", ev.currentTarget.value)}
                      onKeyDown={(ev) => onEntKey(ev, part.key)}
                    />
                  </div>
                ))}
              </div>
              <button className="addent" data-add={part.key} onClick={() => addEntry(part.key)}>
                Add entry
              </button>
            </div>
          );
        })}
      </div>

      <div className="jmeta">
        <span className="saved" id="jsaved" ref={jsaved}>
          Saved
        </span>
        <span id="jcount">
          {dayCount ? `${dayCount} ${dayCount === 1 ? "day written" : "days written"}` : ""}
        </span>
      </div>
    </section>
  );
}
