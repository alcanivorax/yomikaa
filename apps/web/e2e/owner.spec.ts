import { test, expect, type Browser } from "@playwright/test";
import { signIn } from "./session";

const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const API = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";

async function ownerPage(browser: Browser) {
  const ctx = await browser.newContext();
  await signIn(ctx.request, WEB);
  const page = await ctx.newPage();
  return { ctx, page };
}

test.describe("owner", () => {
  test("nav shows all five items and the journal count", async ({ browser }) => {
    const { ctx, page } = await ownerPage(browser);
    await page.goto("/");
    await expect(page.locator("header nav button")).toHaveText([
      "Index",
      "Write",
      "Journal",
      "Tickets",
      "Random",
    ]);
    await expect(page.locator("#f2")).toContainText("journaled");
    await ctx.close();
  });

  test("files a note, persists on reload, edits in place", async ({ browser }) => {
    const { ctx, page } = await ownerPage(browser);
    await page.goto("/write");
    await expect(page.locator("#write")).toHaveClass(/on/);

    await page.click("#wfile");
    await expect(page.locator("#wmsg")).toHaveText("Give it a title first.");

    await page.fill("#wt", "E2E note");
    await page.click("#wfile");
    await expect(page.locator("#wmsg")).toHaveText("Write something first.");

    await page.click('[data-wk="Link"]');
    await page.fill("#wurl", "notaurl");
    await page.click("#wfile");
    await expect(page.locator("#wmsg")).toHaveText(
      "A link needs a full address, starting with http.",
    );

    await page.click('[data-wk="Essay"]');
    await page.fill("#wbody", "A first paragraph.\n\nA second paragraph.");
    await page.click("#wfile");
    await expect(page.locator("#reader")).toBeVisible();
    await expect(page.locator("#rk")).toContainText("Essay");

    await page.goto("/");
    await expect(page.locator("#recent")).toContainText("E2E note");

    await page.reload();
    await expect(page.locator("#recent")).toContainText("E2E note");

    const notes = (await (await ctx.request.get(API + "/notes")).json()) as {
      id: number;
      title: string;
    }[];
    const note = notes.find((n) => n.title === "E2E note");
    expect(note).toBeTruthy();

    await page.goto(`/n/${note!.id}`);
    await page.click("[data-edit]");
    await expect(page.locator("#write")).toHaveClass(/on/);
    await expect(page.locator("#wt")).toHaveValue("E2E note");
    await page.fill("#wt", "E2E note edited");
    await page.click("#wfile");
    await expect(page.locator("#reader")).toBeVisible();

    await page.goto("/");
    await expect(page.locator("#recent")).toContainText("E2E note edited");
    await ctx.close();
  });

  test("journal entries persist across reload", async ({ browser }) => {
    const { ctx, page } = await ownerPage(browser);
    await page.goto("/journal");
    await expect(page.locator("#journal")).toHaveClass(/on/);
    await page.click('[data-add="life"]');
    await page.fill('.ent[data-p="life"][data-i="0"] [data-f="from"]', "09:00");
    await page.fill('.ent[data-p="life"][data-i="0"] [data-f="to"]', "10:30");
    await page.fill(
      '.ent[data-p="life"][data-i="0"] [data-f="text"]',
      "Morning walk.",
    );
    await page.waitForTimeout(1000);
    await page.reload();
    await expect(
      page.locator('.ent[data-p="life"][data-i="0"] [data-f="text"]'),
    ).toHaveValue("Morning walk.");
    await expect(page.locator("#jcount")).toContainText("1 day written");
    await ctx.close();
  });

  test("tickets persist and remove in two steps", async ({ browser }) => {
    const { ctx, page } = await ownerPage(browser);
    await page.goto("/tickets");
    await expect(page.locator("#tickets")).toHaveClass(/on/);
    await page.click("#tadd");
    const tk = page.locator("#tlist .tk").first();
    await tk.locator('[data-tf="key"]').fill("E2E-1");
    await tk.locator('[data-tf="title"]').fill("E2E ticket");
    await tk.locator('[data-tf="note"]').fill("notes");
    await page.waitForTimeout(1000);
    await page.reload();
    await expect(
      page.locator("#tlist .tk [data-tf='key']").first(),
    ).toHaveValue("E2E-1");

    const del = page.locator("#tlist .tk [data-tdel]").first();
    await del.click();
    await expect(del).toHaveText("Sure?");
    await del.click();
    await expect(page.locator("#tlist .tk")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("#tlist .tk")).toHaveCount(0);
    await ctx.close();
  });

  test("reduced motion: reader opens instantly, no curtain", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    await signIn(ctx.request, WEB);
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("#bigh")).toBeVisible();
    await page.locator("#recent .row").first().click();
    await expect(page.locator("#reader")).toBeVisible();
    await ctx.close();
  });
});
