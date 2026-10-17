"use client";

import { useApp } from "@/lib/app-context";

/* Placeholder markup for the Tickets view; wired up in the Tickets step. */
export function TicketsView() {
  const { cur } = useApp();
  return (
    <section className={cur === "tickets" ? "view on" : "view"} id="tickets">
      <div className="col th">
        <div className="ttop rv">
          <h2 className="thead">
            Tickets,<em>and where they stand</em>
          </h2>
          <div className="steps">
            <button id="tadd">Add ticket</button>
          </div>
        </div>
        <div className="tfil rv" style={{ "--d": 1 } as React.CSSProperties} id="tfil" role="group" aria-label="Filter by status" />
        <div className="tlist" id="tlist" role="list" aria-label="Tickets" />
      </div>
      <div className="jmeta">
        <span className="saved" id="tsaved">Saved</span>
        <span id="tcount" />
      </div>
    </section>
  );
}
