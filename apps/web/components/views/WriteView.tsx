"use client";

import { useApp } from "@/lib/app-context";

/* Placeholder markup for the Write view; wired up in the Write step. */
export function WriteView() {
  const { cur } = useApp();
  return (
    <section className={cur === "write" ? "view on" : "view"} id="write">
      <div className="wr">
        <input className="titlein" id="wt" placeholder="Untitled" autoComplete="off" aria-label="Title" />
        <div className="wrow">
          <div className="seg" id="wkinds" role="group" aria-label="Kind" />
          <div className="chips">
            <span id="wchips" style={{ display: "contents" }} />
            <input className="mini" id="wti" placeholder="add a shelf" autoComplete="off" aria-label="Add a shelf" />
          </div>
        </div>
        <div className="wrow" id="wurlrow" hidden>
          <input className="mini" style={{ minWidth: "min(100%,440px)" }} id="wurl" placeholder="https://" autoComplete="off" aria-label="Link address" />
        </div>
        <textarea className="wtext" id="wbody" placeholder="Begin anywhere." aria-label="Body" />
        <div className="marg-in">
          <label className="lbl" htmlFor="wm">
            In the margin · optional, keep it rare
          </label>
          <input id="wm" placeholder="a thought for the side of the page" autoComplete="off" />
        </div>
      </div>
      <div className="dock">
        <span className="st">
          <span id="wcount">0 words</span> · <span className="saved" id="wsaved">saved</span>
        </span>
        <button className="g" id="wsee">Preview</button>
        <button className="g" id="wclear">Start over</button>
        <button className="go" id="wfile">File it</button>
      </div>
      <div id="wmsg" role="status" aria-live="polite" />
    </section>
  );
}
