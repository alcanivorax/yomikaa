import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Restores the seeded state (12 sample notes) by deleting anything the e2e
 * suite created. Visual/computed specs compare against the static reference,
 * so they must run on pristine data regardless of what ran before them.
 */
export function resetMutableData() {
  execFileSync("node", ["scripts/clean-mutable.mjs"], {
    cwd: resolve(__dirname, "../../api"),
    stdio: "inherit",
  });
}
