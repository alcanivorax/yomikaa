import { describe, expect, it } from "vitest";
import {
  draftSchema,
  journalDaySchema,
  noteCreateSchema,
  notePatchSchema,
  ticketSchema,
} from "./schemas";
import { SAMPLE_NOTES } from "./samples";

describe("noteCreateSchema", () => {
  it("accepts a well-formed body", () => {
    const r = noteCreateSchema.safeParse({
      title: "Hi",
      kind: "Essay",
      tags: ["a"],
      date: "2026-09-28",
      body: ["one", "two"],
      m: "margin",
      url: "https://example.com",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a bad date and unknown keys", () => {
    expect(
      noteCreateSchema.safeParse({
        title: "Hi",
        kind: "Essay",
        tags: [],
        date: "28-09-2026",
        body: [],
      }).success,
    ).toBe(false);
    expect(
      noteCreateSchema.safeParse({
        title: "Hi",
        kind: "Essay",
        tags: [],
        date: "2026-09-28",
        body: [],
        extra: 1,
      }).success,
    ).toBe(false);
  });
  it("rejects an unknown kind", () => {
    expect(
      noteCreateSchema.safeParse({
        title: "Hi",
        kind: "Rant",
        tags: [],
        date: "2026-09-28",
        body: [],
      }).success,
    ).toBe(false);
  });
});

describe("notePatchSchema", () => {
  it("omits the date", () => {
    expect("date" in (notePatchSchema.shape as object)).toBe(false);
  });
});

describe("journalDaySchema", () => {
  it("accepts empty parts and rejects 25:00", () => {
    expect(journalDaySchema.safeParse({ life: [], work: [] }).success).toBe(
      true,
    );
    expect(
      journalDaySchema.safeParse({
        life: [{ from: "25:00", to: "", text: "" }],
        work: [],
      }).success,
    ).toBe(false);
  });
  it("accepts 23:59 and empty times", () => {
    expect(
      journalDaySchema.safeParse({
        life: [
          { from: "", to: "", text: "x" },
          { from: "23:59", to: "00:00", text: "" },
        ],
        work: [],
      }).success,
    ).toBe(true);
  });
});

describe("ticketSchema", () => {
  const base = {
    id: "3f1a6c2e-1b2c-4d5e-8a9b-0c1d2e3f4a5b",
    key: "PROJ-1",
    title: "x",
    status: "prog",
    date: "2026-10-17",
    note: "",
  };
  it("accepts a valid ticket", () => {
    expect(ticketSchema.safeParse(base).success).toBe(true);
  });
  it("rejects a non-uuid id and bad status", () => {
    expect(ticketSchema.safeParse({ ...base, id: "1" }).success).toBe(false);
    expect(ticketSchema.safeParse({ ...base, status: "nope" }).success).toBe(
      false,
    );
  });
});

describe("draftSchema", () => {
  it("accepts a null id", () => {
    expect(
      draftSchema.safeParse({
        id: null,
        title: "",
        kind: "Note",
        tags: [],
        body: "",
        m: "",
        url: "",
      }).success,
    ).toBe(true);
  });
});

describe("sample data", () => {
  it("has 12 notes and every one validates as a create body", () => {
    expect(SAMPLE_NOTES).toHaveLength(12);
    for (const n of SAMPLE_NOTES) {
      const r = noteCreateSchema.safeParse({
        title: n.title,
        kind: n.kind,
        tags: n.tags,
        date: n.date,
        body: n.body ?? [],
        ...(n.m ? { m: n.m } : {}),
        ...(n.url ? { url: n.url } : {}),
      });
      expect(r.success).toBe(true);
    }
  });
});
