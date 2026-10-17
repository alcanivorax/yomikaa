import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export default function globalTeardown() {
  execFileSync("node", ["scripts/clean-mutable.mjs"], {
    cwd: resolve(__dirname, "../../api"),
    stdio: "inherit",
  });
}
