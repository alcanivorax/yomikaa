#!/usr/bin/env node
// Generates an OWNER_PASSWORD_HASH value for apps/api/.env.
// Usage: pnpm --filter @yomikaa/api hash:password 'your password'
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
process.stdout.write(`scrypt:${salt.toString("hex")}:${hash.toString("hex")}\n`);
