import type { Request } from "express";
import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";

/** httpOnly cookie names for the Supabase session (set by the Next.js BFF). */
export const ACCESS_COOKIE = "yomikaa-access";
export const REFRESH_COOKIE = "yomikaa-refresh";

export interface VerifiedToken {
  sub: string;
  [claim: string]: unknown;
}

let jwksClient: jwksRsa.JwksClient | null = null;

function getJwks(): jwksRsa.JwksClient {
  if (!jwksClient) {
    const uri =
      process.env.SUPABASE_JWKS_URL ||
      (process.env.SUPABASE_URL
        ? `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`
        : undefined);
    if (!uri) {
      throw new Error(
        "SUPABASE_URL (or SUPABASE_JWKS_URL) must be set to verify RS256 tokens",
      );
    }
    jwksClient = jwksRsa({
      jwksUri: uri,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return jwksClient;
}

async function rsaKeyFor(header: jwt.JwtHeader): Promise<string> {
  if (!header.kid) throw new Error("Token is missing a kid header");
  const client = getJwks();
  return new Promise((resolve, reject) => {
    client.getSigningKey(header.kid as string, (err, key) => {
      if (err || !key) return reject(err ?? new Error("No signing key found"));
      resolve(key.getPublicKey());
    });
  });
}

/**
 * Verifies a Supabase-issued access token locally and returns its claims.
 *
 * Both signing schemes Supabase uses are supported:
 *   - HS256, verified against `SUPABASE_JWT_SECRET`.
 *   - RS256, verified against the project JWKS fetched from `SUPABASE_URL`.
 *
 * The algorithm is read from the token header; anything other than HS256/RS256
 * (including `none`) is rejected. Expiry is checked by `jsonwebtoken.verify`.
 */
export async function verifySupabaseJwt(token: string): Promise<VerifiedToken> {
  let header: jwt.JwtHeader | null;
  try {
    const decoded = jwt.decode(token, { complete: true });
    header = decoded && typeof decoded !== "string" ? decoded.header : null;
  } catch {
    throw new Error("Malformed token");
  }
  if (!header) throw new Error("Malformed token");

  let payload: string | jwt.JwtPayload;
  if (header.alg === "HS256") {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error("SUPABASE_JWT_SECRET must be set to verify HS256 tokens");
    }
    payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } else if (header.alg === "RS256") {
    const key = await rsaKeyFor(header);
    payload = jwt.verify(token, key, { algorithms: ["RS256"] });
  } else {
    throw new Error(`Unsupported token algorithm: ${header.alg}`);
  }

  const sub =
    typeof payload === "object" && payload !== null ? payload.sub : undefined;
  if (typeof sub !== "string" || !sub) throw new Error("Token is missing a sub claim");
  return { ...(typeof payload === "object" ? payload : {}), sub };
}

/**
 * Reads the access token from a request: the `Authorization: Bearer` header
 * (used by tests and non-browser clients) or the httpOnly session cookie
 * (used by the browser via the Next.js BFF).
 */
export function extractAccessToken(
  req: Request,
): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const cookie = req.headers.cookie;
  if (cookie) {
    for (const part of cookie.split(";")) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      if (part.slice(0, eq).trim() === ACCESS_COOKIE) {
        const value = part.slice(eq + 1).trim();
        if (value) return decodeURIComponent(value);
      }
    }
  }
  return undefined;
}
