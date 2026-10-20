import { NextResponse } from "next/server";
import { callApiAuth, setSessionCookies } from "@/lib/bff";

/**
 * Same-origin sign-in. The browser posts the owner's email and password here;
 * this route forwards them to the API's POST /auth/login (server-side, via the
 * API_URL service binding on Vercel), then stores the returned Supabase session
 * in httpOnly cookies. Keeping the exchange server-side avoids CORS and never
 * exposes the tokens to the sign-in form's JS.
 */
export async function POST(req: Request) {
  let email = "";
  let password = "";
  try {
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    if (typeof body?.email === "string") email = body.email.trim();
    if (typeof body?.password === "string") password = body.password;
  } catch {
    /* fall through to the 400 below */
  }

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required." },
      { status: 400 },
    );
  }

  const result = await callApiAuth("login", { email, password });

  if (result.status === 429) {
    return NextResponse.json(
      { message: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }
  if (!result.ok || !result.session) {
    return NextResponse.json(
      { message: "Invalid email or password." },
      { status: 401 },
    );
  }

  const out = NextResponse.json({ ok: true });
  setSessionCookies(out, result.session);
  return out;
}
