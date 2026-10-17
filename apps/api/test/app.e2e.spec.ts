import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac } from "node:crypto";
import path from "node:path";
import request from "supertest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * End-to-end tests against the compiled server, driven over HTTP.
 *
 * NestJS 12 ships as ESM-only, which `@nestjs/testing` cannot load under Jest
 * on Node 22 (require(esm) in Jest needs Node 24.9+). Booting the built server
 * as a child process keeps the spec-required Jest + supertest stack intact and
 * exercises the real HTTP surface. See DEVIATIONS.md.
 */

const PORT = 4100;
const BASE = `http://127.0.0.1:${PORT}/api/v1`;
const SECRET = process.env.AUTH_DEV_SECRET as string;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

let server: ChildProcess;
let serverLog = "";
let ownerToken = "";

const createdNoteIds: number[] = [];
const createdTicketIds: string[] = [];
const touchedDays: string[] = [];

async function waitForHealth(timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server did not become healthy.\n${serverLog}`);
}

beforeAll(async () => {
  server = spawn("node", [path.join(__dirname, "..", "dist", "main.js")], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout?.on("data", (d) => (serverLog += d.toString()));
  server.stderr?.on("data", (d) => (serverLog += d.toString()));

  await waitForHealth();

  const res = await request(BASE).post("/auth/dev-token").send({ secret: SECRET });
  if (res.status !== 201 || !res.body.token) {
    throw new Error(`dev-token failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  ownerToken = res.body.token as string;
}, 40000);

afterAll(async () => {
  if (createdNoteIds.length) {
    await prisma.note.deleteMany({ where: { id: { in: createdNoteIds } } });
    await prisma.tag.deleteMany({ where: { notes: { none: {} } } });
  }
  if (createdTicketIds.length) {
    await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  }
  if (touchedDays.length) {
    await prisma.journalDay.deleteMany({
      where: { date: { in: touchedDays.map((d) => new Date(d + "T00:00:00Z")) } },
    });
  }
  await prisma.draft.deleteMany({});
  await prisma.$disconnect();
  server?.kill("SIGTERM");
});

const auth = () => ({ Authorization: `Bearer ${ownerToken}` });

describe("public reads", () => {
  it("health verifies the database", async () => {
    const res = await request(BASE).get("/health").expect(200);
    expect(res.body).toEqual({ status: "ok", db: "up" });
  });

  it("lists all notes newest first", async () => {
    const res = await request(BASE).get("/notes").expect(200);
    const dates = res.body.map((n: { date: string }) => n.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(res.body.length).toBeGreaterThanOrEqual(12);
  });

  it("filters by kind", async () => {
    const res = await request(BASE).get("/notes?kind=Link").expect(200);
    expect(res.body.every((n: { kind: string }) => n.kind === "Link")).toBe(true);
  });

  it("tags are alphabetical with positive counts", async () => {
    const res = await request(BASE).get("/tags").expect(200);
    const slugs = res.body.map((t: { slug: string }) => t.slug);
    expect([...slugs].sort()).toEqual(slugs);
    expect(res.body.every((t: { count: number }) => t.count > 0)).toBe(true);
  });

  it("stats expose only notes to visitors", async () => {
    const res = await request(BASE).get("/stats").expect(200);
    expect(res.body).not.toHaveProperty("journalDays");
  });

  it("stats include journalDays for the owner", async () => {
    const res = await request(BASE).get("/stats").set(auth()).expect(200);
    expect(res.body).toEqual({
      notes: expect.any(Number),
      journalDays: expect.any(Number),
    });
  });
});

describe("owner guard", () => {
  it("rejects owner routes without a token", async () => {
    await request(BASE).get("/draft").expect(401);
  });

  it("rejects an invalid token", async () => {
    await request(BASE).get("/draft").set({ Authorization: "Bearer a.b.c" }).expect(401);
  });

  it("rejects a valid token for a different subject", async () => {
    const enc = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString("base64url");
    const h = enc({ alg: "HS256", typ: "JWT" });
    const p = enc({
      sub: "00000000-0000-0000-0000-000000000000",
      iss: "yomikaa-dev",
    });
    const sig = createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
    await request(BASE)
      .get("/draft")
      .set({ Authorization: `Bearer ${h}.${p}.${sig}` })
      .expect(403);
  });
});

describe("notes (owner)", () => {
  it("creates a note with a computed excerpt and slugged tags", async () => {
    const res = await request(BASE)
      .post("/notes")
      .set(auth())
      .send({
        title: "",
        kind: "Note",
        tags: ["Zeta Tag", "engineering"],
        date: "2026-10-11",
        body: ["hello world", "second"],
        m: "aside",
        url: "",
      })
      .expect(201);
    createdNoteIds.push(res.body.id);
    expect(res.body.title).toBe("Untitled");
    expect(res.body.tags).toEqual(["engineering", "zeta-tag"]);
    expect(res.body.ex).toBe("hello world second");
    expect(res.body.sample).toBe(false);
  });

  it("rejects a Link without an http(s) url", async () => {
    await request(BASE)
      .post("/notes")
      .set(auth())
      .send({ title: "x", kind: "Link", tags: [], date: "2026-10-11", body: [], url: "nope" })
      .expect(400);
  });

  it("rejects a body-less non-Link note", async () => {
    await request(BASE)
      .post("/notes")
      .set(auth())
      .send({ title: "x", kind: "Note", tags: [], date: "2026-10-11", body: [], url: "" })
      .expect(400);
  });

  it("refuses to patch a sample note", async () => {
    const sample = await prisma.note.findFirst({ where: { isSample: true } });
    await request(BASE)
      .patch(`/notes/${sample!.id}`)
      .set(auth())
      .send({ title: "x", kind: "Note", tags: [], body: ["y"], m: "", url: "" })
      .expect(403);
  });

  it("returns 400 with field errors on bad input", async () => {
    const res = await request(BASE)
      .post("/notes")
      .set(auth())
      .send({ kind: "Nope" })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it("returns 404 for an unknown note", async () => {
    await request(BASE).get("/notes/99999999").expect(404);
  });
});

describe("journal (owner)", () => {
  const day = "2026-11-03";

  beforeAll(() => touchedDays.push(day));

  it("replaces a day, filters unused entries and orders by start time", async () => {
    const res = await request(BASE)
      .put(`/journal/days/${day}`)
      .set(auth())
      .send({
        life: [{ from: "22:00", to: "01:30", text: "late" }],
        work: [
          { from: "09:00", to: "10:00", text: "second" },
          { from: "08:00", to: "09:00", text: "first" },
          { from: "", to: "", text: "" },
        ],
      })
      .expect(200);
    expect(res.body.work.map((e: { text: string }) => e.text)).toEqual([
      "first",
      "second",
    ]);
    expect(res.body.life).toHaveLength(1);
  });

  it("reports the day in the month map and year counts", async () => {
    const month = await request(BASE)
      .get("/journal/months/2026-11")
      .set(auth())
      .expect(200);
    expect(month.body.days[day].work).toHaveLength(2);

    const counts = await request(BASE)
      .get("/journal/years/2026/counts")
      .set(auth())
      .expect(200);
    expect(counts.body["2026-11"]).toBeGreaterThanOrEqual(1);
  });

  it("deletes the day when nothing remains", async () => {
    const res = await request(BASE)
      .put(`/journal/days/${day}`)
      .set(auth())
      .send({ life: [], work: [] })
      .expect(200);
    expect(res.body).toEqual({ life: [], work: [] });

    const rows = await prisma.journalDay.count({
      where: { date: new Date(day + "T00:00:00Z") },
    });
    expect(rows).toBe(0);
  });

  it("rejects invalid times", async () => {
    await request(BASE)
      .put(`/journal/days/${day}`)
      .set(auth())
      .send({ life: [{ from: "25:00", to: "", text: "x" }], work: [] })
      .expect(400);
  });
});

describe("tickets (owner)", () => {
  it("upserts a used ticket", async () => {
    const id = crypto.randomUUID();
    createdTicketIds.push(id);
    const res = await request(BASE)
      .put(`/tickets/${id}`)
      .set(auth())
      .send({ key: "MG-1", title: "fix", status: "prog", date: "2026-10-01", note: "n" })
      .expect(200);
    expect(res.body).toEqual({ id, key: "MG-1", title: "fix", status: "prog", date: "2026-10-01", note: "n" });
  });

  it("204s and does not store an unused ticket", async () => {
    const id = crypto.randomUUID();
    await request(BASE)
      .put(`/tickets/${id}`)
      .set(auth())
      .send({ key: "", title: "", status: "todo", date: "2026-10-01", note: "" })
      .expect(204);
    expect(await prisma.ticket.count({ where: { id } })).toBe(0);
  });

  it("rejects a future date", async () => {
    await request(BASE)
      .put(`/tickets/${crypto.randomUUID()}`)
      .set(auth())
      .send({ key: "x", title: "y", status: "todo", date: "2999-01-01", note: "" })
      .expect(400);
  });

  it("deletes a ticket", async () => {
    const id = crypto.randomUUID();
    await request(BASE)
      .put(`/tickets/${id}`)
      .set(auth())
      .send({ key: "MG-9", title: "z", status: "todo", date: "2026-10-01", note: "" })
      .expect(200);
    await request(BASE).delete(`/tickets/${id}`).set(auth()).expect(204);
    expect(await prisma.ticket.count({ where: { id } })).toBe(0);
  });
});

describe("draft (owner)", () => {
  it("starts empty", async () => {
    const res = await request(BASE).get("/draft").set(auth()).expect(200);
    expect(res.body).toBeNull();
  });

  it("stores, returns and clears the draft", async () => {
    const draft = {
      id: null,
      title: "t",
      kind: "Note",
      tags: ["x"],
      body: "hello",
      m: "",
      url: "",
    };
    await request(BASE).put("/draft").set(auth()).send(draft).expect(200);
    const got = await request(BASE).get("/draft").set(auth()).expect(200);
    expect(got.body).toEqual(draft);
    await request(BASE).delete("/draft").set(auth()).expect(204);
    const empty = await request(BASE).get("/draft").set(auth()).expect(200);
    expect(empty.body).toBeNull();
  });
});
