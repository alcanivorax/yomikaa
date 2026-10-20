import { NextResponse } from "next/server";
import { apiBase } from "@/lib/api";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  readCookieHeader,
  setSessionCookies,
  type AuthSession,
} from "@/lib/auth";

/**
 * Server-side exchange with the API's `/auth/*` endpoints. Runs in a Next.js
 * route handler, so `apiBase()` resolves to the `API_URL` service binding on
 * Vercel (or `http://localhost:4000` locally). The browser never calls these
 * directly and never sees the tokens.
 */
export async function callApiAuth(
  path: "login" | "refresh" | "logout",
  body: unknown,
): Promise<{ ok: boolean; status: number; session?: AuthSession }> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/auth/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 502 };
  }
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const session = (await res.json()) as AuthSession;
  return { ok: true, status: res.status, session };
}

/** Reads the current refresh token from the incoming request's cookies. */
export function refreshFromRequest(req: Request): string | undefined {
  return readCookieHeader(req.headers.get("cookie"), REFRESH_COOKIE);
}

/** Reads the current access token from the incoming request's cookies. */
export function accessFromRequest(req: Request): string | undefined {
  return readCookieHeader(req.headers.get("cookie"), ACCESS_COOKIE);
}

export { setSessionCookies, NextResponse };
