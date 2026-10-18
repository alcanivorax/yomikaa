import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { resetMutableData } from "./reset-data";
import { signIn } from "./session";

const REF_URL =
  "file:///home/vagabond/Project/yomikaa/yomikaa-agent-kit/reference/yomikaa-reference.html";
const APP_URL = process.env.E2E_WEB_URL ?? "http://localhost:3000";

test.beforeAll(() => resetMutableData());

const SIZES = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 834, height: 1194 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

async function ready(page: Page) {
  if (process.env.VIS_NOGRAIN) {
    await page.addStyleTag({ content: "body::after{display:none !important}" });
  }
  await page
    .evaluate(() =>
      Promise.race([
        document.fonts.ready.then(() => true),
        new Promise((r) => setTimeout(r, 3000)),
      ]),
    )
    .catch(() => undefined);
  await page.waitForTimeout(350);
}

async function goView(page: Page, name: string) {
  await page.click(`nav [data-go="${name}"]`);
  await page.waitForTimeout(600);
}

async function openNote(page: Page, title: string) {
  await page.locator("[data-open]").filter({ hasText: title }).first().click();
  await page.waitForSelector("#reader:not([hidden])", { timeout: 5000 });
  await page.waitForTimeout(400);
}

const STATES: { name: string; drive: (page: Page) => Promise<void> }[] = [
  { name: "home", drive: async () => {} },
  {
    name: "home-query",
    drive: async (p) => {
      await p.fill("#q1", "design");
      await p.waitForTimeout(400);
    },
  },
  { name: "index", drive: (p) => goView(p, "search") },
  {
    name: "index-query",
    drive: async (p) => {
      await goView(p, "search");
      await p.fill("#q2", "design");
      await p.waitForTimeout(500);
    },
  },
  {
    name: "index-shelf",
    drive: async (p) => {
      await goView(p, "search");
      const shelf = p.locator("#tags [data-t]").first();
      await shelf.waitFor({ state: "attached", timeout: 5000 });
      await shelf.evaluate((el) => (el as HTMLElement).click());
      await p.waitForTimeout(600);
    },
  },
  {
    name: "index-empty",
    drive: async (p) => {
      await goView(p, "search");
      await p.fill("#q2", "zzzzzz");
      await p.waitForTimeout(500);
    },
  },
  { name: "reader-boring", drive: (p) => openNote(p, "The case for boring infrastructure") },
  { name: "reader-typography", drive: (p) => openNote(p, "A good reading list on typography") },
  { name: "reader-binary", drive: (p) => openNote(p, "Binary search, off-by-one cheatsheet") },
  { name: "write-empty", drive: (p) => goView(p, "write") },
  { name: "journal-empty", drive: (p) => goView(p, "journal") },
  { name: "tickets-empty", drive: (p) => goView(p, "tickets") },
];

async function diff(scratch: Page, a: Buffer, b: Buffer) {
  const ua = `data:image/png;base64,${a.toString("base64")}`;
  const ub = `data:image/png;base64,${b.toString("base64")}`;
  return scratch.evaluate(
    async ([ua, ub]: string[]) => {
      const load = (src: string) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      const [ia, ib] = await Promise.all([load(ua), load(ub)]);
      const w = Math.min(ia.width, ib.width);
      const h = Math.min(ia.height, ib.height);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d")!;
      g.drawImage(ia, 0, 0);
      const A = g.getImageData(0, 0, w, h).data;
      g.clearRect(0, 0, w, h);
      g.drawImage(ib, 0, 0);
      const B = g.getImageData(0, 0, w, h).data;
      let d = 0;
      const bands = new Array(10).fill(0);
      const bandH = Math.ceil(h / 10);
      let minX = w,
        minY = h,
        maxX = 0,
        maxY = 0;
      for (let i = 0; i < A.length; i += 4) {
        if (
          Math.abs(A[i] - B[i]) > 10 ||
          Math.abs(A[i + 1] - B[i + 1]) > 10 ||
          Math.abs(A[i + 2] - B[i + 2]) > 10
        ) {
          d++;
          const px = (i / 4) % w;
          const py = Math.floor(i / 4 / w);
          bands[Math.min(9, Math.floor(py / bandH))]++;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }
      const bandRatios = bands.map((n, bi) => {
        const rows = Math.min(bandH, h - bi * bandH);
        return +(n / (rows * w)).toFixed(4);
      });
      return {
        ratio: d / (w * h),
        bands: bandRatios,
        bbox: `${minX},${minY}-${maxX},${maxY}`,
        ref: `${ia.width}x${ia.height}`,
        app: `${ib.width}x${ib.height}`,
      };
    },
    [ua, ub],
  );
}

for (const size of SIZES) {
  test(`${size.width}x${size.height}`, async ({ browser }) => {
    test.setTimeout(300_000);
    const label = `${size.width}x${size.height}`;
    const outDir = test.info().outputPath("visual");
    fs.mkdirSync(outDir, { recursive: true });

    const refCtx = await browser.newContext({ reducedMotion: "reduce", viewport: size });
    const appCtx = await browser.newContext({ reducedMotion: "reduce", viewport: size });
    await signIn(appCtx.request, APP_URL);

    const refPage = await refCtx.newPage();
    const appPage = await appCtx.newPage();
    const scratch = await appCtx.newPage();

    for (const state of STATES) {
      if (process.env.VIS_ONLY && state.name !== process.env.VIS_ONLY) continue;
      console.log(`[visual] ${label} ${state.name} ref…`);
      await refPage.goto(REF_URL);
      await ready(refPage);
      await state.drive(refPage);
      await ready(refPage);
      const refShot = await refPage.screenshot({ fullPage: true });
      console.log(`[visual] ${label} ${state.name} app…`);

      await appPage.goto(APP_URL + "/");
      await ready(appPage);
      await state.drive(appPage);
      await ready(appPage);
      const appShot = await appPage.screenshot({ fullPage: true });

      const r = await diff(scratch, refShot, appShot);
      console.log(
        `[visual] ${label} ${state.name} ratio=${r.ratio.toFixed(4)} ref=${r.ref} app=${r.app} bbox=${r.bbox} bands=${JSON.stringify(r.bands)}`,
      );
      if (r.ratio > 0.02) {
        fs.writeFileSync(path.join(outDir, `${label}-${state.name}-ref.png`), refShot);
        fs.writeFileSync(path.join(outDir, `${label}-${state.name}-app.png`), appShot);
      }
      expect
        .soft(
          r.ratio,
          `${state.name}@${label} ratio=${r.ratio.toFixed(4)} ref=${r.ref} app=${r.app}`,
        )
        .toBeLessThan(0.02);
    }

    await refCtx.close();
    await appCtx.close();
  });
}
