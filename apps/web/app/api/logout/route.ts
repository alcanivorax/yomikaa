import { NextResponse } from "next/server";
import { callApiAuth, refreshFromRequest } from "@/lib/bff";
import { clearSessionCookies } from "@/lib/auth";

/**
 * Sign-out. Forwards the refresh token to the API for a best-effort server-side
 * revoke, then clears the session cookies regardless of the API outcome.
 */
export async function POST(req: Request) {
  const refreshToken = refreshFromRequest(req);
  if (refreshToken) {
    await callApiAuth("logout", { refresh_token: refreshToken }).catch(
      () => undefined,
    );
  }
  const out = NextResponse.json({ ok: true });
  clearSessionCookies(out);
  return out;
}
