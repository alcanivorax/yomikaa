const _KEY_LENGTH = 64;
import { createHash, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

/** Constant-time equality that does not leak length via early return. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Verifies a password against `scrypt:<salt-hex>:<hash-hex>` (see
 * scripts/hash-password.mjs). Returns false on any malformed input rather than
 * throwing, so callers get a single "invalid credentials" path.
 */
async function verifyHash(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}

export function credentialsConfigured(): boolean {
  return Boolean(
    process.env.OWNER_USERNAME &&
      (process.env.OWNER_PASSWORD_HASH || process.env.OWNER_PASSWORD),
  );
}

/**
 * Single-owner credential check. The username is compared in constant time and
 * the password is verified against a scrypt hash when OWNER_PASSWORD_HASH is
 * set, otherwise against the plaintext OWNER_PASSWORD (timing-safe). Both
 * comparisons always run so a wrong username and a wrong password cost the
 * same.
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUser = process.env.OWNER_USERNAME;
  if (!expectedUser) return false;

  const userOk = safeEqual(username, expectedUser);
  const hash = process.env.OWNER_PASSWORD_HASH;
  const plain = process.env.OWNER_PASSWORD;
  const passOk = hash
    ? await verifyHash(password, hash)
    : plain
      ? safeEqual(password, plain)
      : false;

  return userOk && passOk;
}
