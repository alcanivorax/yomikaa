import { createHmac, timingSafeEqual } from "node:crypto";

export interface TokenPayload {
  sub?: string;
  iss?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

const ISSUER = "yomikaa";
const TTL_SECONDS = 60 * 60 * 24 * 7;

const b64url = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

interface ParsedJwt {
  header: { alg?: string };
  payload: TokenPayload;
  signingInput: Buffer;
  signature: Buffer;
}

function parseJwt(token: string): ParsedJwt {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [h, p, s] = parts;
  return {
    header: JSON.parse(b64url(h).toString("utf8")),
    payload: JSON.parse(b64url(p).toString("utf8")) as TokenPayload,
    signingInput: Buffer.from(`${h}.${p}`),
    signature: b64url(s),
  };
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

export function mintToken(subject: string): string {
  const enc = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const header = enc({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = enc({
    sub: subject,
    iss: ISSUER,
    iat: now,
    exp: now + TTL_SECONDS,
  });
  const input = `${header}.${payload}`;
  const sig = createHmac("sha256", authSecret()).update(input).digest("base64url");
  return `${input}.${sig}`;
}

export function verifyToken(token: string): TokenPayload {
  const { header, payload, signingInput, signature } = parseJwt(token);
  if (header.alg !== "HS256") throw new Error("Unexpected algorithm");
  if (payload.iss !== ISSUER) throw new Error("Unexpected issuer");
  const expected = createHmac("sha256", authSecret()).update(signingInput).digest();
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
    throw new Error("Bad signature");
  }
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
    throw new Error("Token expired");
  }
  return payload;
}
