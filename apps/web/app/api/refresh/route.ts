import { NextResponse } from "next/server";
import { callApiAuth, refreshFromRequest, setSessionCookies } from "@/lib/bff";

/**
 * Silent refresh. The frontend calls this when an API request returns 401 (the
 * access token expired). It reads the httpOnly refresh cookie server-side,
 * exchanges it for a fresh session, and resets the cookies. Returns 401 if the
 * refresh token is missing or invalid so the frontend can sign the user out.
 */
export async function POST(req: Request) {
  const refreshToken = refreshFromRequest(req);
  if (!refreshToken) {
    return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  }

  const result = await callApiAuth("refresh", { refresh_token: refreshToken });

  if (!result.ok || !result.session) {
    return NextResponse.json({ message: "Session expired." }, { status: 401 });
  }

  const out = NextResponse.json({ ok: true });
  setSessionCookies(out, result.session);
  return out;
}
