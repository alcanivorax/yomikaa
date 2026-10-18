import { test, expect, type Browser } from "@playwright/test";
import { signIn } from "./session";

const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3000";

async function ownerContext(browser: Browser) {
  const ctx = await browser.newContext();
  await signIn(ctx.request, WEB);
  return ctx;
}

async function instrument(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __anims: { id: string; dur: number; delay: number; t: number }[];
      __net: { url: string; method: string; t: number }[];
      __t0: number;
    };
    w.__anims = [];
    w.__net = [];
    w.__t0 = 0;
    const oa = Element.prototype.animate;
    Element.prototype.animate = function (
      this: Element,
      kf: Keyframe[] | PropertyIndexedKeyframes | null,
      opt?: number | KeyframeAnimationOptions,
    ) {
      const anim = oa.call(this, kf, opt as KeyframeAnimationOptions);
      const rawDur = typeof opt === "number" ? opt : opt?.duration;
      const dur = typeof rawDur === "number" ? rawDur : 0;
      const rawDelay = typeof opt === "object" && opt ? opt.delay : 0;
      const delay = typeof rawDelay === "number" ? rawDelay : 0;
      w.__anims.push({
        id: this.id || this.className.toString(),
        dur,
        delay,
        t: performance.now(),
      });
      return anim;
    };
    const orig = window.fetch.bind(window);
    window.fetch = function (...args: Parameters<typeof fetch>) {
      const a0 = args[0];
      const url = String(
        a0 && typeof a0 === "object" && "url" in a0 ? a0.url : a0,
      );
      const method = String(
        args[1]?.method ?? (a0 && typeof a0 === "object" && "method" in a0 ? a0.method : "GET"),
      ).toUpperCase();
      w.__net.push({ url, method, t: performance.now() });
      return orig(...args);
    } as typeof fetch;
  });
}

async function waitNet(page: import("@playwright/test").Page, pattern: string) {
  await page.waitForFunction(
    (pat) =>
      (window as unknown as { __net: { url: string; method: string }[] }).__net.some(
        (n) => n.url.includes(pat) && n.method !== "GET",
      ),
    pattern,
    { timeout: 8000 },
  );
  return page.evaluate(
    (pat) => {
      const w = window as unknown as {
        __net: { url: string; method: string; t: number }[];
        __t0: number;
      };
      const e = w.__net.find((n) => n.url.includes(pat) && n.method !== "GET");
      return e ? e.t - w.__t0 : -1;
    },
    pattern,
  );
}

test.describe("timing", () => {
  test("curtain, reader and knob durations", async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await ownerContext(browser);
    const page = await ctx.newPage();
    await instrument(page);
    await page.goto("/");
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      (window as unknown as { __anims: unknown[] }).__anims.length = 0;
    });
    await page.click('nav [data-go="search"]');
    await page.waitForTimeout(1600);
    const curtain = await page.evaluate(
      () =>
        (window as unknown as { __anims: { id: string; dur: number; delay: number }[] }).__anims.filter(
          (a) => a.id === "curtain",
        ),
    );
    expect(curtain.map((a) => a.dur)).toEqual([560, 680]);
    expect(curtain.map((a) => a.delay)).toEqual([0, 140]);

    await page.goto("/");
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      (window as unknown as { __anims: unknown[] }).__anims.length = 0;
    });
    await page.locator("#recent .row").first().click();
    await page.waitForSelector("#reader:not([hidden])");
    await page.waitForTimeout(1100);
    await page.click("#rclose");
    await page.waitForTimeout(1000);
    const reader = await page.evaluate(
      () =>
        (window as unknown as { __anims: { id: string; dur: number }[] }).__anims.filter(
          (a) => a.id === "reader",
        ),
    );
    expect(reader.map((a) => a.dur)).toEqual([900, 700]);

    await page.click('nav [data-go="write"]');
    await page.waitForTimeout(1600);
    const knob = await page.evaluate(() => {
      const el = document.querySelector(".knob");
      if (!el) return -1;
      const d = getComputedStyle(el).transitionDuration;
      return parseFloat(d) * 1000;
    });
    expect(knob).toBe(600);

    await ctx.close();
  });

  test("debounces and remove disarm", async ({ browser }) => {
    test.setTimeout(180_000);
    const ctx = await ownerContext(browser);
    const page = await ctx.newPage();
    await instrument(page);

    await page.goto("/write");
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const w = window as unknown as {
        __net: unknown[];
        __t0: number;
      };
      w.__net.length = 0;
      w.__t0 = performance.now();
    });
    await page.fill("#wbody", "timing check");
    const draft = await waitNet(page, "/draft");
    expect(draft).toBeGreaterThan(550);
    expect(draft).toBeLessThan(1100);

    await page.goto("/journal");
    await page.waitForTimeout(1200);
    await page.click('[data-add="life"]');
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const w = window as unknown as { __net: unknown[]; __t0: number };
      w.__net.length = 0;
      w.__t0 = performance.now();
    });
    await page.locator('[data-f="text"]').first().fill("timing day");
    const journal = await waitNet(page, "/journal/days/");
    expect(journal).toBeGreaterThan(450);
    expect(journal).toBeLessThan(1000);

    await page.goto("/tickets");
    await page.waitForTimeout(1200);
    await page.click("#tadd");
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const w = window as unknown as { __net: unknown[]; __t0: number };
      w.__net.length = 0;
      w.__t0 = performance.now();
    });
    await page.locator('#tlist .tk [data-tf="key"]').first().fill("T-1");
    const ticket = await waitNet(page, "/tickets/");
    expect(ticket).toBeGreaterThan(350);
    expect(ticket).toBeLessThan(950);

    const del = page.locator("#tlist .tk [data-tdel]").first();
    await del.click();
    await expect(del).toHaveText("Sure?");
    const t0 = Date.now();
    await expect(del).not.toHaveText("Sure?", { timeout: 6000 });
    const disarm = Date.now() - t0;
    expect(disarm).toBeGreaterThan(2400);
    expect(disarm).toBeLessThan(3400);

    await ctx.close();
  });
});
