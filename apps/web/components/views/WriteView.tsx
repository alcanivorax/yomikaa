"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  KINDS,
  buildNote,
  fileError,
  slug,
  today,
  wordCount,
  type Draft,
} from "@marginalia/shared";
import { useApp } from "@/lib/app-context";
import { ApiError } from "@/lib/api";

const blank = (): Draft => ({
  id: null,
  title: "",
  kind: "Essay",
  tags: [],
  body: "",
  m: "",
  url: "",
});

export function WriteView() {
  const {
    cur,
    notes,
    draft,
    saveDraft,
    saveState,
    openNote,
    createNote,
    updateNote,
    go,
  } = useApp();
  const [W, setW] = useState<Draft>(() => draft ?? blank());
  const [tagText, setTagText] = useState("");
  const touched = useRef(false);

  const wt = useRef<HTMLInputElement | null>(null);
  const wbody = useRef<HTMLTextAreaElement | null>(null);
  const wm = useRef<HTMLInputElement | null>(null);
  const wurl = useRef<HTMLInputElement | null>(null);
  const wmsg = useRef<HTMLDivElement | null>(null);
  const wsaved = useRef<HTMLSpanElement | null>(null);
  const wkinds = useRef<HTMLDivElement | null>(null);
  const knob = useRef<HTMLSpanElement | null>(null);
  const dt = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const msgT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flashT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const grow = (t?: HTMLTextAreaElement | null) => {
    const el = t ?? wbody.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + 4 + "px";
  };

  const msg = (text: string) => {
    const m = wmsg.current;
    if (!m) return;
    m.textContent = text;
    m.style.opacity = text ? "1" : "0";
    clearTimeout(msgT.current);
    if (text)
      msgT.current = setTimeout(() => {
        if (wmsg.current) wmsg.current.style.opacity = "0";
      }, 2600);
  };

  const flash = () => {
    const s = wsaved.current;
    if (!s) return;
    s.style.opacity = "1";
    clearTimeout(flashT.current);
    flashT.current = setTimeout(() => {
      if (wsaved.current) wsaved.current.style.opacity = "0";
    }, 1300);
  };

  const draftSave = (next: Draft) => {
    clearTimeout(dt.current);
    dt.current = setTimeout(() => {
      saveDraft(next);
    }, 700);
  };

  useEffect(() => {
    if (touched.current || !draft) return;
    setW(draft);
  }, [draft]);

  useEffect(() => {
    if (saveState.draft === "saved") flash();
    else if (saveState.draft === "error" && wsaved.current) {
      wsaved.current.textContent = "Not saved";
      wsaved.current.style.opacity = "1";
    } else if (saveState.draft === "saving" && wsaved.current) {
      wsaved.current.textContent = "saved";
    }
  }, [saveState.draft]);

  const placeKnob = (instant: boolean) => {
    const pressed = wkinds.current?.querySelector<HTMLElement>(
      '[data-wk][aria-pressed="true"]',
    );
    const k = knob.current;
    if (!pressed || !k) return;
    if (instant) k.style.transition = "none";
    k.style.left = pressed.offsetLeft + "px";
    k.style.width = pressed.offsetWidth + "px";
    if (instant) {
      void k.offsetWidth;
      k.style.transition = "";
    }
  };

  useLayoutEffect(() => {
    if (cur !== "write") return;
    placeKnob(true);
  }, [cur]);

  useLayoutEffect(() => {
    if (cur !== "write") return;
    placeKnob(false);
  }, [W.kind, cur]);

  useEffect(() => {
    const onResize = () => placeKnob(true);
    window.addEventListener("resize", onResize);
    if (typeof document !== "undefined" && document.fonts)
      document.fonts.ready.then(() => placeKnob(true));
    return () => window.removeEventListener("resize", onResize);
     
  }, []);

  useEffect(() => {
    grow();
     
  }, [cur, W.body]);

  const field = (k: "title" | "body" | "m" | "url", v: string) => {
    touched.current = true;
    const next = { ...W, [k]: v };
    setW(next);
    msg("");
    draftSave(next);
  };

  const addTag = () => {
    touched.current = true;
    const next = { ...W };
    const t = slug(tagText);
    if (t && !next.tags.includes(t)) next.tags.push(t);
    setTagText("");
    setW(next);
    draftSave(next);
  };

  const onTagKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !e.currentTarget.value && W.tags.length) {
      touched.current = true;
      const next = { ...W, tags: W.tags.slice(0, -1) };
      setW(next);
      draftSave(next);
    }
  };

  const removeTag = (i: number) => {
    touched.current = true;
    const next = { ...W, tags: W.tags.filter((_, x) => x !== i) };
    setW(next);
    draftSave(next);
  };

  const setKind = (k: Draft["kind"]) => {
    touched.current = true;
    const next = { ...W, kind: k };
    setW(next);
    draftSave(next);
  };

  const draftNote = () => {
    const original = W.id != null ? notes.find((n) => n.id === W.id) : null;
    return buildNote({
      title: W.title,
      kind: W.kind,
      tags: W.tags,
      date: original ? original.date : today(),
      body: W.body,
      m: W.m,
      url: W.url,
    });
  };

  const fileIt = async () => {
    const err = fileError({
      title: W.title,
      body: W.body,
      kind: W.kind,
      url: W.url,
    });
    if (err) {
      msg(err.message);
      const el =
        err.field === "title" ? wt : err.field === "body" ? wbody : wurl;
      el.current?.focus();
      return;
    }
    const n = draftNote();
    try {
      let id: number;
      if (W.id != null) {
        id = (await updateNote(W.id, n)).id;
      } else {
        id = (await createNote(n)).id;
      }
      setW(blank());
      saveDraft(null);
      msg("Filed.");
      setTimeout(() => openNote(id), 500);
    } catch (e) {
      msg(e instanceof ApiError ? e.message : "Could not file.");
    }
  };
  const fileItRef = useRef(fileIt);
  fileItRef.current = fileIt;

  useEffect(() => {
    const onFile = () => fileItRef.current();
    const onEdit = (e: Event) => {
      const id = (e as CustomEvent<number>).detail;
      const n = notes.find((x) => x.id === id);
      if (!n || n.sample) return;
      touched.current = true;
      setW({
        id,
        title: n.title,
        kind: n.kind,
        tags: [...n.tags],
        body: (n.body || [n.ex]).join("\n\n"),
        m: n.m || "",
        url: n.url || "",
      });
      if (cur !== "write") go("write");
    };
    window.addEventListener("mg:file", onFile);
    window.addEventListener("mg:edit", onEdit);
    return () => {
      window.removeEventListener("mg:file", onFile);
      window.removeEventListener("mg:edit", onEdit);
    };
     
  }, [notes, cur, go]);

  const words = wordCount(W.body);

  return (
    <section className={cur === "write" ? "view on" : "view"} id="write">
      <div className="wr">
        <input
          className="titlein"
          id="wt"
          ref={wt}
          placeholder="Untitled"
          autoComplete="off"
          aria-label="Title"
          value={W.title}
          onInput={(e) => field("title", e.currentTarget.value)}
        />
        <div className="wrow">
          <div className="seg" id="wkinds" role="group" aria-label="Kind" ref={wkinds}>
            {KINDS.map((k) => (
              <button
                key={k}
                data-wk={k}
                aria-pressed={W.kind === k}
                onClick={() => setKind(k)}
              >
                {k}
              </button>
            ))}
            <span className="knob" id="knob" ref={knob} />
          </div>
          <div className="chips">
            <span id="wchips" style={{ display: "contents" }}>
              {W.tags.map((t, i) => (
                <button
                  key={t}
                  className="chip"
                  data-rm={i}
                  title="Click to remove"
                  onClick={() => removeTag(i)}
                >
                  #{t}
                </button>
              ))}
            </span>
            <input
              className="mini"
              id="wti"
              placeholder="add a shelf"
              autoComplete="off"
              aria-label="Add a shelf"
              value={tagText}
              onInput={(e) => setTagText(e.currentTarget.value)}
              onKeyDown={onTagKey}
              onBlur={() => {
                if (tagText.trim()) addTag();
              }}
            />
          </div>
        </div>
        <div className="wrow" id="wurlrow">
          <input
            className="mini"
            style={{ minWidth: "min(100%,440px)" }}
            id="wurl"
            ref={wurl}
            placeholder="https://"
            autoComplete="off"
            aria-label="Link address"
            value={W.url}
            onInput={(e) => field("url", e.currentTarget.value)}
          />
        </div>
        <textarea
          className="wtext"
          id="wbody"
          ref={wbody}
          placeholder="Begin anywhere."
          aria-label="Body"
          value={W.body}
          onInput={(e) => {
            grow(e.currentTarget);
            field("body", e.currentTarget.value);
          }}
        />
        <div className="marg-in">
          <label className="lbl" htmlFor="wm">
            In the margin · optional, keep it rare
          </label>
          <input
            id="wm"
            ref={wm}
            placeholder="a thought for the side of the page"
            autoComplete="off"
            value={W.m}
            onInput={(e) => field("m", e.currentTarget.value)}
          />
        </div>
      </div>
      <div className="dock">
        <span className="st">
          <span id="wcount">{words} words</span> ·{" "}
          <span className="saved" id="wsaved" ref={wsaved}>
            saved
          </span>
        </span>
        <button
          className="g"
          id="wsee"
          onClick={() => openNote(-1, { id: -1, ...draftNote() })}
        >
          Preview
        </button>
        <button
          className="g"
          id="wclear"
          onClick={() => {
            touched.current = true;
            setW(blank());
            saveDraft(null);
            msg("");
          }}
        >
          Start over
        </button>
        <button className="go" id="wfile" onClick={fileIt}>
          File it
        </button>
      </div>
      <div id="wmsg" role="status" aria-live="polite" ref={wmsg} />
    </section>
  );
}
