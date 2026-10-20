import { NextResponse } from "next/server";
import { accessFromRequest } from "@/lib/bff";
import { accessTokenLooksValid } from "@/lib/auth";

/**
 * Session probe used by the frontend to restore owner UI state on load. It only
 * checks that a non-expired access token cookie exists — a cheap hint, not an
 * authorization decision. Real signature verification happens on every protected
 * request in the API's OwnerGuard.
 */
export async function GET(req: Request) {
  const token = accessFromRequest(req);
  return NextResponse.json({ authenticated: accessTokenLooksValid(token) });
}
