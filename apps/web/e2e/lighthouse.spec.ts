import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const CHROME =
  process.env.LH_CHROME ??
  "/home/vagabond/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome";

test("lighthouse mobile budget", async () => {
  test.skip(
    !process.env.LH,
    "opt-in: run with LH=1 (requires Chrome + network for npx lighthouse)",
  );
  test.setTimeout(240_000);
  const out = "/tmp/opencode/lh.json";
  const code = await new Promise<number>((resolve) => {
    const child = spawn(
      "npx",
      [
        "--yes",
        "lighthouse",
        WEB,
        "--form-factor=mobile",
        "--only-categories=performance,accessibility",
        "--output=json",
        `--output-path=${out}`,
        "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
        "--quiet",
      ],
      { stdio: "inherit", env: { ...process.env, CHROME_PATH: CHROME } },
    );
    child.on("exit", (c) => resolve(c ?? 1));
  });
  expect(code).toBe(0);
  const report = JSON.parse(readFileSync(out, "utf8"));
  const perf = report.categories.performance.score * 100;
  const a11y = report.categories.accessibility.score * 100;
  console.log(`[lighthouse] performance=${perf} accessibility=${a11y}`);
  expect(a11y).toBeGreaterThanOrEqual(90);
  expect(perf).toBeGreaterThanOrEqual(85);
});
