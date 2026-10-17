import { test, expect, type Page } from "@playwright/test";
import { resetMutableData } from "./reset-data";

const REF_URL =
  "file:///home/vagabond/Project/yomikaa/yomikaa-agent-kit/reference/yomikaa-reference.html";
const APP_URL = process.env.E2E_WEB_URL ?? "http://localhost:3000";

test.beforeAll(() => resetMutableData());

const PROPS = [
  "display",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textAlign",
  "verticalAlign",
  "color",
  "backgroundColor",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginBottom",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopColor",
  "borderTopLeftRadius",
  "columnGap",
  "rowGap",
];

type Case = { view: string; drive: (p: Page) => Promise<void>; sels: string[] };

async function goView(page: Page, name: string) {
  await page.click(`nav [data-go="${name}"]`);
  await page.waitForTimeout(600);
}

async function openReader(page: Page) {
  await page.locator("#recent .row").first().click();
  await page.waitForSelector("#reader:not([hidden])", { timeout: 8000 });
  await page.waitForTimeout(600);
}

const CASES: Case[] = [
  {
    view: "home",
    drive: async () => {},
    sels: [
      "header nav button:nth-child(1)",
      "header nav button:nth-child(2)",
      ".eyebrow",
      "#bigh",
      "#q1",
      ".hint span",
      ".marq .mq",
      ".marq .mq sup",
      ".sec h2",
      ".idx .row",
      ".pull",
      ".foot",
    ],
  },
  {
    view: "search",
    drive: (p) => goView(p, "search"),
    sels: [
      "#q2",
      ".num span",
      ".num small",
      ".rail h4",
      "#kinds .pill",
      "#tags .pill",
      "#sort button",
      "#list .row",
    ],
  },
  {
    view: "write",
    drive: (p) => goView(p, "write"),
    sels: [
      "#wt",
      ".seg button",
      "#wti",
      "#wurlrow",
      "#wurl",
      "#wbody",
      ".marg-in .lbl",
      "#wm",
      ".dock .st",
      ".dock .g",
      ".dock .go",
    ],
  },
  {
    view: "journal",
    drive: (p) => goView(p, "journal"),
    sels: [".months .pill", ".jbody", ".jmeta .saved"],
  },
  {
    view: "tickets",
    drive: (p) => goView(p, "tickets"),
    sels: ["#tadd", ".tfil .pill", ".tempty"],
  },
  {
    view: "reader",
    drive: openReader,
    sels: [
      "#rk",
      "#rbody .side dt",
      "#rbody .side dd",
      "#rbody .side .pill",
      "#rbody .rt",
      "#rbody .rb p",
    ],
  },
];

function norm(
  snap: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(snap)) {
    if (k === "fontFamily") {
      const parts = v.split(",");
      const first = parts[0].replace(/[^a-z0-9]/gi, "").toLowerCase();
      const rest = parts
        .slice(1)
        .join(",")
        .replace(/["']/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      out[k] = `${first}|${rest}`;
    } else if (/color/i.test(k)) {
      out[k] = v.replace(/\s+/g, " ").trim();
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function snapshot(page: Page, sels: string[]) {
  const props = [...PROPS, "fontFamily"];
  return page.evaluate(
    ({ sels, props }) => {
      const out: Record<string, Record<string, string>> = {};
      for (const sel of sels) {
        const els = document.querySelectorAll(sel);
        out[`${sel}||count`] = { n: String(els.length) };
        if (els.length === 0) continue;
        const cs = getComputedStyle(els[0]);
        const rec: Record<string, string> = {};
        for (const p of props) rec[p] = cs.getPropertyValue(p);
        out[sel] = rec;
      }
      return out;
    },
    { sels, props },
  );
}

test("computed styles match the reference", async ({ browser }) => {
  test.setTimeout(300_000);
  const mismatches: string[] = [];
  for (const size of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    for (const c of CASES) {
      const ctxs = await Promise.all(
        (["ref", "app"] as const).map(async (kind) => {
          const ctx = await browser.newContext({
            reducedMotion: "reduce",
            viewport: size,
          });
          if (kind === "app")
            await ctx.request.post(APP_URL + "/api/dev-login");
          const page = await ctx.newPage();
          await page.goto(kind === "ref" ? REF_URL : APP_URL);
          await page
            .evaluate(() =>
              Promise.race([
                document.fonts.ready.then(() => true),
                new Promise((r) => setTimeout(r, 3000)),
              ]),
            )
            .catch(() => undefined);
          await page.waitForTimeout(400);
          await c.drive(page);
          return { ctx, page };
        }),
      );
      const [ref, app] = ctxs;
      const [rs, as] = await Promise.all([
        snapshot(ref.page, c.sels),
        snapshot(app.page, c.sels),
      ]);
      for (const sel of c.sels) {
        const rc = rs[`${sel}||count`]?.n;
        const ac = as[`${sel}||count`]?.n;
        if (rc !== ac) {
          mismatches.push(
            `${size.width} ${c.view} ${sel} count ref=${rc} app=${ac}`,
          );
          continue;
        }
        if (!rs[sel] || !as[sel]) continue;
        const r = norm(rs[sel]);
        const a = norm(as[sel]);
        for (const p of Object.keys(r)) {
          if (r[p] !== a[p])
            mismatches.push(
              `${size.width} ${c.view} ${sel} ${p}: ref="${r[p]}" app="${a[p]}"`,
            );
        }
      }
      await Promise.all(ctxs.map((x) => x.ctx.close()));
    }
  }
  expect(mismatches.join("\n")).toBe("");
});
