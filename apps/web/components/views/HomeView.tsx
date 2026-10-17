"use client";

import { useEffect, useRef } from "react";
import {
  allTags,
  esc,
  fmt,
  hasDay,
  matchQ,
  pad2,
} from "@marginalia/shared";
import { useApp } from "@/lib/app-context";

const RM =
  typeof window !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

function heroHTML(): string {
  const lines: [string, number][] = [
    ["Everything I've", 0],
    ["written down,", 1],
    ["in one place.", 0],
  ];
  let k = 0;
  return lines
    .map(
      ([text, it]) =>
        `<span class="ln${it ? " it" : ""}" aria-hidden="true">${[...text]
          .map((c) =>
            c === " "
              ? '<span class="sp"></span>'
              : `<span class="ch${c === "." ? " dot" : ""}" style="--k:${k++}">${c}</span>`,
          )
          .join("")}</span>`,
    )
    .join("");
}

export function HomeView() {
  const { cur, notes, journal } = useApp();
  const hero = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);
  const heroT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const playHero = () => {
    const h = hero.current;
    if (!h) return;
    clearTimeout(heroT.current);
    h.classList.remove("go");
    void h.offsetWidth;
    heroT.current = setTimeout(() => h.classList.add("go"), RM ? 0 : 300);
  };

  useEffect(() => {
    if (cur !== "home") return;
    playHero();
     
  }, [cur]);

  useEffect(() => {
    const start = () => {
      if (started.current) return;
      started.current = true;
      playHero();
    };
    if (document.fonts?.ready) document.fonts.ready.then(start);
    const t = setTimeout(start, 1800);
    return () => clearTimeout(t);
     
  }, []);

  const tags = allTags(notes);
  const recent = [...notes]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, 6);
  const days = Object.values(journal).filter(hasDay).length;

  const q1Input = (e: React.FormEvent<HTMLInputElement>) => {
    const q = e.currentTarget.value.trim();
    const el = document.getElementById("hmatch");
    if (!el) return;
    if (!q) {
      el.textContent = "Press enter to open the index";
      return;
    }
    const k = notes.filter((n) => matchQ(n, q)).length;
    el.textContent = `${k} ${k === 1 ? "match" : "matches"}, press enter`;
  };

  const q1Key = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")
      window.dispatchEvent(
        new CustomEvent("mg:search", { detail: e.currentTarget.value }),
      );
  };

  return (
    <section className={cur === "home" ? "view on" : "view"} id="home">
      <div className="hero" id="hero" ref={hero}>
        <div className="orb" id="orb" />
        <div className="col">
          <p className="eyebrow">
            A personal archive · <span id="hcount">{notes.length}</span> notes and
            counting
          </p>
          <h1
            className="big"
            id="bigh"
            aria-label="Everything I've written down, in one place."
            dangerouslySetInnerHTML={{ __html: heroHTML() }}
          />
          <div className="finder">
            <label className="lbl" htmlFor="q1">
              Search the archive
            </label>
            <input
              className="megain"
              id="q1"
              type="search"
              placeholder="start typing"
              autoComplete="off"
              onInput={q1Input}
              onKeyDown={q1Key}
            />
            <div className="hint">
              <span id="hmatch">Press enter to open the index</span>
              <span>Press / from anywhere</span>
            </div>
          </div>
        </div>
      </div>
      <div className="marq" aria-label="Shelves">
        <div className="mtrack" id="mq">
          {[false, true, true, true].map((hidden, gi) =>
            tags.map((t) => (
              <button
                key={`${gi}-${t}`}
                className="mq"
                data-shelf={esc(t)}
                {...(hidden ? { tabIndex: -1, "aria-hidden": true } : {})}
              >
                {esc(t)}
                <sup>{notes.filter((n) => n.tags.includes(t)).length}</sup>
              </button>
            )),
          )}
        </div>
      </div>
      <div className="col">
        <div className="sec rv">
          <h2>Recently filed</h2>
          <button className="lbl" data-go="search">
            See everything
          </button>
        </div>
        <div className="idx" id="recent">
          {recent.map((n, i) => (
            <a
              key={n.id}
              className="row rv"
              style={{ "--d": i } as React.CSSProperties}
              data-open={n.id}
              tabIndex={0}
            >
              <span className="no">{pad2(i + 1)}</span>
              <span className="tt">{esc(n.title)}</span>
              <span className="mt">
                {n.kind} · {fmt(n.date)}
              </span>
            </a>
          ))}
        </div>
      </div>
      <button className="pull" data-random>
        <span>Pull a random page</span>
      </button>
      <footer className="foot">
        <span id="f1">{notes.length} notes filed</span>
        <span id="f2">
          {days}
          {days === 1 ? " day journaled" : " days journaled"}
        </span>
        <span>Written by hand, kept in one place</span>
      </footer>
    </section>
  );
}
