import { describe, expect, it } from "vitest";
import { SAMPLE_NOTES } from "./samples";
import type { Note, Ticket } from "./types";
import {
  allTags,
  calendarLead,
  chronology,
  chronologyNumber,
  esc,
  excerpt,
  fmt,
  fmtDur,
  hl,
  key,
  matchQ,
  partMin,
  readingMinutes,
  shiftDay,
  shiftMonth,
  slug,
  sortNotes,
  spanMin,
  toMin,
  usedEntry,
  usedTicket,
} from "./helpers";

const notes: Note[] = SAMPLE_NOTES.map((n, i) => ({ ...n, id: i }));

describe("slug", () => {
  it("lowercases and hyphenates runs of non-alphanumerics", () => {
    expect(slug("  Hello, World! ")).toBe("hello-world");
    expect(slug("Design & Animation")).toBe("design-animation");
  });
  it("returns empty for punctuation-only input", () => {
    expect(slug("---")).toBe("");
  });
});

describe("matchQ", () => {
  it("requires every word (AND)", () => {
    const n = notes[0];
    expect(matchQ(n, "boring infrastructure")).toBe(true);
    expect(matchQ(n, "boring zzz")).toBe(false);
  });
  it("is case-insensitive and searches title, excerpt, tags and body", () => {
    expect(matchQ(notes[0], "POSTGRES")).toBe(true);
    expect(matchQ(notes[0], "engineering")).toBe(true);
    expect(matchQ(notes[0], "cron")).toBe(true);
  });
  it("matches everything for an empty query", () => {
    expect(matchQ(notes[0], "")).toBe(true);
    expect(matchQ(notes[0], "   ")).toBe(true);
  });
});

describe("date helpers", () => {
  it("formats a date key", () => {
    expect(fmt("2026-09-28")).toBe("Sep 28");
  });
  it("key uses local time, never UTC", () => {
    expect(key(new Date(2026, 8, 28, 23, 30))).toBe("2026-09-28");
    expect(key(new Date(2026, 0, 1, 0, 1))).toBe("2026-01-01");
  });
});

describe("excerpt", () => {
  it("keeps 139 and 140 characters untouched", () => {
    expect(excerpt(["a".repeat(139)])).toBe("a".repeat(139));
    expect(excerpt(["a".repeat(140)])).toBe("a".repeat(140));
  });
  it("truncates at 140 with an ellipsis when longer", () => {
    expect(excerpt(["a".repeat(141)])).toBe("a".repeat(140) + "...");
  });
  it("falls back to the url when there is no body", () => {
    expect(excerpt([], "https://example.com")).toBe("https://example.com");
  });
});

describe("chronology", () => {
  it("sorts ascending by date then id", () => {
    const ch = chronology(notes);
    expect(ch[0].title).toBe("Morning pages, month three");
    expect(ch[ch.length - 1].title).toBe("The case for boring infrastructure");
  });
  it("numbers the oldest note 01 and the newest 12", () => {
    const oldest = chronology(notes)[0];
    const newest = chronology(notes)[11];
    expect(chronologyNumber(notes, oldest.id)).toBe("01");
    expect(chronologyNumber(notes, newest.id)).toBe("12");
  });
});

describe("sortNotes", () => {
  it("new is newest first, old is oldest first", () => {
    expect(sortNotes(notes, "new")[0].title).toBe(
      "The case for boring infrastructure",
    );
    expect(sortNotes(notes, "old")[0].title).toBe("Morning pages, month three");
  });
  it("az uses localeCompare on the title", () => {
    const az = sortNotes(notes, "az").map((n) => n.title);
    expect([...az].sort((a, b) => a.localeCompare(b))).toEqual(az);
  });
});

describe("calendarLead", () => {
  it("is the Monday-first blank count for known months", () => {
    // 2026-01-01 is a Thursday -> getDay()=4 -> 3
    expect(calendarLead("2026-01")).toBe(3);
    // 2026-07-01 is a Wednesday -> getDay()=3 -> 2
    expect(calendarLead("2026-07")).toBe(2);
    // 2026-02-01 is a Sunday -> getDay()=0 -> 6
    expect(calendarLead("2026-02")).toBe(6);
    expect(calendarLead("2026-03")).toBe(6); // 2026-03-01 Sunday
  });
});

describe("shiftDay / shiftMonth", () => {
  const capDay = "2026-10-17";
  const capMonth = "2026-10";
  it("never moves a day into the future", () => {
    expect(shiftDay("2026-10-17", 1, capDay)).toBe("2026-10-17");
    expect(shiftDay("2026-10-16", 1, capDay)).toBe("2026-10-17");
    expect(shiftDay("2026-09-30", 1, capDay)).toBe("2026-10-01");
  });
  it("today (s=0) always resolves to the cap", () => {
    expect(shiftDay("2026-01-01", 0, capDay)).toBe("2026-10-17");
  });
  it("steps months across year boundaries and stops at the cap", () => {
    expect(shiftMonth("2026-01", -1, capMonth)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1, capMonth)).toBe("2026-01");
    expect(shiftMonth("2026-10", 1, capMonth)).toBe("2026-10");
  });
});

describe("hl", () => {
  it("escapes html in the title and excerpt", () => {
    expect(hl("<b>Hello</b> & world", "")).toBe(
      "&lt;b&gt;Hello&lt;/b&gt; &amp; world",
    );
  });
  it("wraps query words in mark after escaping", () => {
    expect(hl("Design & motion", "design")).toBe(
      "<mark>Design</mark> &amp; motion",
    );
  });
  it("does not break on regex characters in the query", () => {
    expect(hl("a.b (c)", ".")).toBe("a<mark>.</mark>b (c)");
  });
});

describe("esc", () => {
  it("escapes the five reference characters", () => {
    expect(esc('&<>"')).toBe("&amp;&lt;&gt;&quot;");
  });
});

describe("readingMinutes", () => {
  it("is at least 1", () => {
    expect(readingMinutes([])).toBe(1);
    expect(readingMinutes(["short"])).toBe(1);
  });
  it("rounds words / 200", () => {
    expect(readingMinutes([Array(400).fill("w").join(" ")])).toBe(2);
  });
});

describe("journal time math", () => {
  it("parses HH:MM and rejects junk", () => {
    expect(toMin("09:30")).toBe(570);
    expect(toMin("9:30")).toBe(570);
    expect(toMin("")).toBeNull();
    expect(toMin("nope")).toBeNull();
  });
  it("an end before the start crosses midnight", () => {
    expect(spanMin({ from: "22:00", to: "01:30" })).toBe(210);
    expect(fmtDur(210)).toBe("3h 30m");
  });
  it("ignores entries missing a time", () => {
    expect(spanMin({ from: "09:00", to: "" })).toBe(0);
    expect(spanMin({ from: "", to: "" })).toBe(0);
  });
  it("formats durations", () => {
    expect(fmtDur(0)).toBe("");
    expect(fmtDur(45)).toBe("45m");
    expect(fmtDur(60)).toBe("1h");
    expect(fmtDur(90)).toBe("1h 30m");
  });
  it("sums parts", () => {
    expect(
      partMin([
        { from: "09:00", to: "10:30" },
        { from: "10:30", to: "12:00" },
      ]),
    ).toBe(180);
  });
  it("a start-only row is unused", () => {
    expect(usedEntry({ from: "09:00", to: "", text: "" })).toBe(false);
    expect(usedEntry({ from: "", to: "", text: "hi" })).toBe(true);
    expect(usedEntry({ from: "09:00", to: "10:00", text: "" })).toBe(true);
  });
});

describe("ticket rules", () => {
  it("is used when key, title or note is non-empty", () => {
    const t = (p: Partial<Ticket>): Ticket => ({
      id: "1",
      key: "",
      title: "",
      status: "todo",
      date: "2026-10-17",
      note: "",
      ...p,
    });
    expect(usedTicket(t({}))).toBe(false);
    expect(usedTicket(t({ key: "PROJ-1" }))).toBe(true);
    expect(usedTicket(t({ title: "x" }))).toBe(true);
    expect(usedTicket(t({ note: "x" }))).toBe(true);
  });
});

describe("allTags", () => {
  it("collects distinct shelves alphabetically", () => {
    expect(allTags(notes)).toEqual([
      "algorithms",
      "animation",
      "books",
      "design",
      "engineering",
      "habits",
      "interview",
      "javascript",
      "opinion",
      "systems",
      "tools",
      "writing",
    ]);
  });
});
