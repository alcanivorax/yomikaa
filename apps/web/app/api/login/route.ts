import { NextResponse } from "next/server";
import { SESSION_COOKIE, apiBase } from "@/lib/api";

/**
 * Same-origin sign-in. The browser posts the owner's username and password
 * here; this route forwards them to the API's POST /auth/login (server-side,
 * via the API_URL service binding on Vercel), then stores the returned session
 * token in a cookie. Keeping the exchange server-side avoids CORS and never
 * exposes the token to the sign-in form's JS beyond the cookie it sets.
 */
export async function POST(req: Request) {
  let username = "";
  let password = "";
  try {
    const body = (await req.json()) as { username?: unknown; password?: unknown };
    if (typeof body?.username === "string") username = body.username;
    if (typeof body?.password === "string") password = body.password;
  } catch {
    /* fall through to the 400 below */
  }

  if (!username || !password) {
    return NextResponse.json(
      { message: "Username and password are required." },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${apiBase()}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    return NextResponse.json(
      { message: "Could not reach the server." },
      { status: 502 },
    );
  }

  if (res.status === 404) {
    return NextResponse.json({ message: "Sign-in is disabled." }, { status: 503 });
  }
  if (!res.ok) {
    return NextResponse.json(
      { message: "Invalid username or password." },
      { status: 401 },
    );
  }

  const { token } = (await res.json()) as { token: string };
  const out = NextResponse.json({ ok: true });
  out.cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return out;
}
