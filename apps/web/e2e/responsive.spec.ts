import { test, expect } from "@playwright/test";

const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3000";

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

const VIEWS = ["/", "/index", "/write", "/journal", "/tickets"];

async function noHorizontalScroll(page: import("@playwright/test").Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 0) {
    const detail = await page.evaluate(() => {
      const cw = document.documentElement.clientWidth;
      const rows: string[] = [];
      let maxRight = 0;
      let maxRightLabel = "";
      document.querySelectorAll("*").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > cw + 1 || r.width > cw + 1) {
          rows.push(
            `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 30)} w=${Math.round(r.width)} left=${Math.round(r.left)} right=${Math.round(r.right)}`,
          );
        }
        if (r.right > maxRight) {
          maxRight = r.right;
          maxRightLabel = `${el.tagName.toLowerCase()}#${el.id}`;
        }
      });
      return { offenders: rows.slice(0, 10), maxRight, maxRightLabel };
    });
    console.log(`OVERFLOW ${label} ${overflow} :: ${JSON.stringify(detail)}`);
  }
  expect(overflow, `horizontal overflow at ${label}: ${overflow}`).toBeLessThanOrEqual(0);
}

test.describe("responsive", () => {
  test("no horizontal scroll across the size matrix", async ({ browser }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    await ctx.request.post(WEB + "/api/dev-login");

    for (const size of SIZES) {
      for (const view of VIEWS) {
        const page = await ctx.newPage();
        await page.setViewportSize(size);
        await page.goto(view, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);
        await noHorizontalScroll(page, `${view} @ ${size.width}x${size.height}`);
        await page.close();
      }
      const page = await ctx.newPage();
      await page.setViewportSize(size);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.locator("#recent .row").first().click();
      await expect(page.locator("#reader")).toBeVisible();
      await page.waitForTimeout(500);
      await noHorizontalScroll(page, `/n @ ${size.width}x${size.height}`);
      await page.close();
    }

    await ctx.close();
  });

  test("five-item nav fits at 360px", async ({ browser }) => {
    const ctx = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 360, height: 740 },
    });
    await ctx.request.post(WEB + "/api/dev-login");
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("header nav button")).toHaveText([
      "Index",
      "Write",
      "Journal",
      "Tickets",
      "Random",
    ]);
    const boxes = await page.locator("header nav button").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right };
      }),
    );
    for (const b of boxes) {
      expect(b.left, "nav item left").toBeGreaterThanOrEqual(0);
      expect(b.right, "nav item right").toBeLessThanOrEqual(360);
    }
    await ctx.close();
  });
});
