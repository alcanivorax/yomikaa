"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  TICKET_STATUSES,
  TICKET_LABELS,
  newTicketId,
  today,
  usedTicket,
  type Ticket,
  type TicketStatus,
} from "@yomikaa/shared";
import { useApp } from "@/lib/app-context";

export function TicketsView() {
  const { cur, tickets, setTickets, saveState } = useApp();
  const [T, setT] = useState<Ticket[]>([]);
  const [tf, setTf] = useState<"all" | TicketStatus>("all");
  const [armed, setArmed] = useState<string | null>(null);

  const root = useRef<HTMLElement | null>(null);
  const tsaved = useRef<HTMLSpanElement | null>(null);
  const ticketsRef = useRef(tickets);
  const Tref = useRef(T);
  const tfRef = useRef(tf);
  const dirty = useRef(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);
  useEffect(() => {
    Tref.current = T;
  }, [T]);
  useEffect(() => {
    tfRef.current = tf;
  }, [tf]);

  const flashSaved = () => {
    const s = tsaved.current;
    if (!s) return;
    s.style.opacity = "1";
    clearTimeout((s as unknown as { _t?: ReturnType<typeof setTimeout> })._t);
    (s as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      s.style.opacity = "0";
    }, 1300);
  };

  /* autosave */
  const tPend = useRef(false);
  const tTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const saveT = () => {
    tPend.current = false;
    setTickets(Tref.current.filter(usedTicket));
  };
  const saveRef = useRef(saveT);
  saveRef.current = saveT;

  useEffect(() => {
    if (saveState.tickets === "saved") flashSaved();
    else if (saveState.tickets === "error" && tsaved.current) {
      tsaved.current.textContent = "Not saved";
      tsaved.current.style.opacity = "1";
    } else if (saveState.tickets === "saving" && tsaved.current) {
      tsaved.current.textContent = "Saved";
    }
  }, [saveState.tickets]);

  const queueT = () => {
    tPend.current = true;
    clearTimeout(tTimer.current);
    tTimer.current = setTimeout(() => saveRef.current(), 500);
  };

  const flushT = () => {
    if (tPend.current) {
      clearTimeout(tTimer.current);
      saveRef.current();
    }
  };

  /* reload on entering the view */
  useEffect(() => {
    if (cur === "tickets") {
      flushT();
      dirty.current = false;
      setT(ticketsRef.current);
    }
     
  }, [cur]);

  /* adopt freshly fetched tickets until the user edits */
  useEffect(() => {
    if (cur === "tickets" && !dirty.current) setT(ticketsRef.current);
     
  }, [tickets, cur]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) flushT();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
     
  }, []);

  /* auto-grow title/note textareas */
  const growAll = () => {
    root.current
      ?.querySelectorAll<HTMLTextAreaElement>("#tlist .tkt, #tlist .tkn")
      .forEach((t) => {
        t.style.height = "auto";
        t.style.height = t.scrollHeight + 4 + "px";
      });
  };

  useLayoutEffect(() => {
    growAll();
     
  }, [T, cur]);

  useEffect(() => {
    const onResize = () => {
      if (cur === "tickets") growAll();
    };
    window.addEventListener("resize", onResize);
    if (document.fonts)
      document.fonts.ready.then(() => {
        if (cur === "tickets") growAll();
      });
    return () => window.removeEventListener("resize", onResize);
     
  }, [cur]);

  const addTicket = () => {
    dirty.current = true;
    const t: Ticket = {
      id: newTicketId(),
      key: "",
      title: "",
      status: tf === "all" ? "todo" : tf,
      date: today(),
      note: "",
    };
    setT((prev) => [t, ...prev]);
    requestAnimationFrame(() => {
      root.current
        ?.querySelector<HTMLElement>(`.tk[data-id="${t.id}"] [data-tf="key"]`)
        ?.focus();
    });
  };

  const update = (id: string, field: keyof Ticket, v: string) => {
    dirty.current = true;
    setT((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: v } : t)));
    queueT();
  };

  const onKeyEnter = (e: ReactKeyboardEvent<HTMLElement>, id: string) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    const t = e.target as HTMLElement;
    if (t.matches('[data-tf="key"]')) {
      e.preventDefault();
      root.current
        ?.querySelector<HTMLElement>(`.tk[data-id="${id}"] [data-tf="title"]`)
        ?.focus();
    } else if (t.matches('[data-tf="title"]')) {
      e.preventDefault();
      root.current
        ?.querySelector<HTMLElement>(`.tk[data-id="${id}"] [data-tf="note"]`)
        ?.focus();
    }
  };

  const remove = (id: string) => {
    if (armed === id) {
      dirty.current = true;
      setT((prev) => prev.filter((t) => t.id !== id));
      queueT();
      setArmed(null);
      return;
    }
    setArmed(id);
    clearTimeout(armTimer.current);
    armTimer.current = setTimeout(() => setArmed(null), 2800);
  };

  const used = T.filter(usedTicket);
  const counts = (s: "all" | TicketStatus) =>
    used.filter((t) => s === "all" || t.status === s).length;
  const rows = T.filter((t) => tf === "all" || t.status === tf);
  const all = counts("all");

  return (
    <section className={cur === "tickets" ? "view on" : "view"} id="tickets" ref={root}>
      <div className="col th">
        <div className="ttop rv">
          <h2 className="thead">
            Tickets,
            <em>and where they stand</em>
          </h2>
          <div className="steps">
            <button id="tadd" onClick={addTicket}>
              Add ticket
            </button>
          </div>
        </div>
        <div
          className="tfil rv"
          style={{ "--d": 1 } as React.CSSProperties}
          id="tfil"
          role="group"
          aria-label="Filter by status"
        >
          {(["all", ...TICKET_STATUSES.map((s) => s.value)] as (
            | "all"
            | TicketStatus
          )[]).map((k) => (
            <button
              key={k}
              className="pill"
              data-tfil={k}
              aria-pressed={k === tf}
              onClick={() => setTf(k)}
            >
              {k === "all" ? "All" : TICKET_LABELS[k]}
              <sup>{counts(k)}</sup>
            </button>
          ))}
        </div>
        <div className="tlist" id="tlist" role="list" aria-label="Tickets">
          {rows.length ? (
            rows.map((t) => (
              <div
                className="tk"
                role="listitem"
                data-id={t.id}
                data-s={t.status}
                key={t.id}
              >
                <input
                  className="tkk"
                  data-tf="key"
                  value={t.key}
                  placeholder="PROJ-123"
                  aria-label="Ticket number"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => update(t.id, "key", e.currentTarget.value)}
                  onKeyDown={(e) => onKeyEnter(e, t.id)}
                />
                <div>
                  <textarea
                    className="tkt"
                    data-tf="title"
                    rows={1}
                    placeholder="What was the ticket?"
                    aria-label="Ticket title"
                    value={t.title}
                    onChange={(e) => update(t.id, "title", e.currentTarget.value)}
                    onKeyDown={(e) => onKeyEnter(e, t.id)}
                  />
                  <textarea
                    className="tkn"
                    data-tf="note"
                    rows={1}
                    placeholder="What you did, what is left"
                    aria-label="Notes"
                    value={t.note}
                    onChange={(e) => update(t.id, "note", e.currentTarget.value)}
                  />
                </div>
                <div className="tkr">
                  <span className="tsw">
                    <span className="dot" data-s={t.status} />
                    <select
                      className="tks"
                      data-tf="status"
                      aria-label="Status"
                      value={t.status}
                      onChange={(e) => update(t.id, "status", e.currentTarget.value)}
                    >
                      {TICKET_STATUSES.map((s) => (
                        <option value={s.value} key={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </span>
                  <input
                    className="tkd"
                    type="date"
                    data-tf="date"
                    value={t.date}
                    max={today()}
                    aria-label="Date worked"
                    onChange={(e) => update(t.id, "date", e.currentTarget.value)}
                  />
                  <button
                    className={"tdel" + (armed === t.id ? " arm" : "")}
                    data-tdel=""
                    onClick={() => remove(t.id)}
                  >
                    {armed === t.id ? "Sure?" : "Remove"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="tempty">
              {used.length
                ? `Nothing marked ${tf === "all" ? "All" : TICKET_LABELS[tf]}.`
                : "No tickets yet. Add the first one."}
            </div>
          )}
        </div>
      </div>
      <div className="jmeta">
        <span className="saved" id="tsaved" ref={tsaved}>
          Saved
        </span>
        <span id="tcount">{all ? `${all} ${all === 1 ? "ticket" : "tickets"}` : ""}</span>
      </div>
    </section>
  );
}
