import { createHmac, createPublicKey, timingSafeEqual, verify } from "node:crypto";

export interface TokenPayload {
  sub?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  [key: string]: unknown;
}

const b64url = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

interface ParsedJwt {
  header: { alg?: string; kid?: string };
  payload: TokenPayload;
  signingInput: Buffer;
  signature: Buffer;
}

export function parseJwt(token: string): ParsedJwt {
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

export function verifyDevToken(token: string, secret: string): TokenPayload {
  const { header, payload, signingInput, signature } = parseJwt(token);
  if (header.alg !== "HS256") throw new Error("Unexpected algorithm");
  if (payload.iss !== "yomikaa-dev") throw new Error("Unexpected issuer");
  const expected = createHmac("sha256", secret).update(signingInput).digest();
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(signature, expected)
  ) {
    throw new Error("Bad signature");
  }
  return payload;
}

interface Jwk {
  kid?: string;
  kty?: string;
  [key: string]: unknown;
}

let jwksCache: { keys: Jwk[]; fetched: number } | null = null;

async function getJwks(supabaseUrl: string): Promise<Jwk[]> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetched < 10 * 60 * 1000) {
    return jwksCache.keys;
  }
  const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) throw new Error("Failed to fetch JWKS");
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = body.keys ?? [];
  jwksCache = { keys, fetched: now };
  return keys;
}

export async function verifySupabaseToken(
  token: string,
  supabaseUrl: string,
): Promise<TokenPayload> {
  const { header, payload, signingInput, signature } = parseJwt(token);
  if (header.alg !== "RS256") throw new Error("Unexpected algorithm");
  const keys = await getJwks(supabaseUrl);
  const jwk = keys.find((k) => !header.kid || k.kid === header.kid);
  if (!jwk) throw new Error("No matching key");
  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const ok = verify("RSA-SHA256", signingInput, publicKey, signature);
  if (!ok) throw new Error("Bad signature");
  if (payload.iss && !String(payload.iss).startsWith(`${supabaseUrl}/auth/v1`)) {
    throw new Error("Unexpected issuer");
  }
  return payload;
}

export function mintDevToken(secret: string, subject: string): string {
  const enc = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const header = enc({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = enc({
    sub: subject,
    iss: "yomikaa-dev",
    iat: now,
    exp: now + 60 * 60 * 24 * 7,
  });
  const input = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(input).digest("base64url");
  return `${input}.${sig}`;
}

export function verifyToken(token: string): Promise<TokenPayload> | TokenPayload {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (supabaseUrl) return verifySupabaseToken(token, supabaseUrl);
  const secret = process.env.AUTH_DEV_SECRET;
  if (!secret) throw new Error("No auth configured");
  return verifyDevToken(token, secret);
}
