"use client";

import { useApp } from "@/lib/app-context";

/* Placeholder markup for the Journal view; wired up in the Journal step. */
export function JournalView() {
  const { cur } = useApp();
  return (
    <section className={cur === "journal" ? "view on" : "view"} id="journal">
      <div className="col jh">
        <div className="jtop">
          <h2 className="jdate" id="jdate" />
          <div className="steps">
            <button data-step="-1">Earlier</button>
            <button data-step="0" id="jtoday">Today</button>
            <button data-step="1" id="jnext">Later</button>
          </div>
        </div>
        <div className="jb">
          <div className="jbh">
            <div className="jm">
              <button className="ar" data-mstep="-1" aria-label="Previous month">
                ‹
              </button>
              <button className="mlabel" id="jmlabel" data-mtoggle aria-expanded="true" aria-controls="jbody" />
              <button className="ar" data-mstep="1" id="jmnext" aria-label="Next month">
                ›
              </button>
            </div>
            <div className="months" id="jmonths" role="group" aria-label="Months of this year" />
          </div>
          <div className="jbody" id="jbody">
            <div className="cal" id="jcal" />
            <div className="ml" id="jmlist" />
          </div>
        </div>
      </div>
      <div className="jsplit">
        <div className="jp life">
          <div className="jph">
            <h3>Life</h3>
            <span className="tot" id="jlt" />
          </div>
          <div className="sub">how the day felt, who you saw</div>
          <div className="ents" id="jl" role="list" aria-label="Life entries" />
          <button className="addent" data-add="life">
            Add entry
          </button>
        </div>
        <div className="jp work">
          <div className="jph">
            <h3>Work</h3>
            <span className="tot" id="jwt" />
          </div>
          <div className="sub">what moved, what stuck, what is next</div>
          <div className="ents" id="jw" role="list" aria-label="Work entries" />
          <button className="addent" data-add="work">
            Add entry
          </button>
        </div>
      </div>
      <div className="jmeta">
        <span className="saved" id="jsaved">Saved</span>
        <span id="jcount" />
      </div>
    </section>
  );
}
