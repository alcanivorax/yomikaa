import { NextResponse } from "next/server";
import { DEV_TOKEN_COOKIE, apiBase } from "@/lib/api";

/**
 * Local-development sign-in. The Supabase project is the real auth path; when
 * it is not configured the browser has no session, so this route exchanges the
 * server-side dev secret for the API's HS256 owner token and drops it in a
 * cookie the client can read. Registered as a deviation; never used in
 * production where Supabase Auth is configured.
 */
export async function POST() {
  const secret = process.env.AUTH_DEV_SECRET;
  if (!secret) {
    return NextResponse.json(
      { message: "Dev sign-in is disabled." },
      { status: 503 },
    );
  }

  const res = await fetch(`${apiBase()}/auth/dev-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret }),
  });
  if (!res.ok) {
    return NextResponse.json(
      { message: "Could not reach the API." },
      { status: 502 },
    );
  }

  const { token } = (await res.json()) as { token: string };
  const out = NextResponse.json({ ok: true });
  out.cookies.set(DEV_TOKEN_COOKIE, token, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return out;
}
