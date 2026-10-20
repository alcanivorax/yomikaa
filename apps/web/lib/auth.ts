import type { NextResponse } from "next/server";

/**
 * Session cookie names. The Supabase access + refresh tokens live in httpOnly
 * cookies set by the Next.js BFF (route handlers) and read server-side only —
 * browser JS never sees the raw tokens. The API reads `yomikaa-access` either
 * from this cookie (same-origin) or an `Authorization: Bearer` header.
 */
export const ACCESS_COOKIE = "yomikaa-access";
export const REFRESH_COOKIE = "yomikaa-refresh";

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

const isProd = process.env.NODE_ENV === "production";

/** Base cookie options shared by both session cookies. */
function cookieOpts(expiresInSeconds: number) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    maxAge: expiresInSeconds,
  };
}

/** Stores the Supabase session (access + refresh) in httpOnly cookies. */
export function setSessionCookies(res: NextResponse, session: AuthSession): void {
  res.cookies.set(ACCESS_COOKIE, session.access_token, cookieOpts(session.expires_in));
  // Keep the refresh cookie around longer than the access token so silent
  // refreshes can happen after the access token expires.
  res.cookies.set(
    REFRESH_COOKIE,
    session.refresh_token,
    cookieOpts(60 * 60 * 24 * 30),
  );
}

/** Clears both session cookies (sign-out). */
export function clearSessionCookies(res: NextResponse): void {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: isProd });
  }
}

/** Reads a cookie value from a raw `Cookie` request header. */
export function readCookieHeader(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      const value = part.slice(eq + 1).trim();
      if (value) return decodeURIComponent(value);
    }
  }
  return undefined;
}

/**
 * Cheap expiry check for the access token, used only to drive UI state
 * (`isOwner`). This decodes the JWT payload without verifying the signature —
 * that is fine here because it never gates data access; the API's OwnerGuard
 * performs real signature verification on every protected request.
 */
export function accessTokenLooksValid(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
