import { test, expect } from "@playwright/test";

test.describe("visitor", () => {
  test("sees only Index and Random, no journal count", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header nav button")).toHaveText([
      "Index",
      "Random",
    ]);
    await expect(page.locator("#f2")).toHaveCount(0);
    await expect(page.locator("#hcount")).toHaveText(/^\d+$/);
  });

  test("is redirected away from owner views", async ({ page }) => {
    for (const path of ["/write", "/journal", "/tickets"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/(index|)$/);
      await expect(page.locator(".view.on")).toHaveCount(1);
      await expect(page.locator("#write.on, #journal.on, #tickets.on")).toHaveCount(0);
    }
  });
});
