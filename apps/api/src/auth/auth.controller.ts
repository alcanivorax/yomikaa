import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "./public.decorator";
import { SupabaseAuthService, type AuthSession } from "./supabase-auth.service";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

interface RefreshBody {
  refresh_token?: unknown;
}

/**
 * Single-owner authentication against Supabase Auth. These endpoints are the
 * only place the Supabase client is used; the browser never talks to Supabase
 * directly — it calls these through the Next.js BFF, which stores the returned
 * tokens in httpOnly cookies.
 */
@Public()
@Controller("auth")
export class AuthController {
  constructor(private readonly supabase: SupabaseAuthService) {}

  /** Password sign-in. Throttled like the original custom login. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  async login(@Body() body: LoginBody): Promise<AuthSession> {
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.supabase.login(email, password);
  }

  /** Exchanges a refresh token for a fresh access token + refresh token. */
  @Post("refresh")
  async refresh(@Body() body: RefreshBody): Promise<AuthSession> {
    const refreshToken =
      typeof body?.refresh_token === "string" ? body.refresh_token.trim() : "";
    if (!refreshToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    return this.supabase.refresh(refreshToken);
  }

  /**
   * Best-effort sign-out. Real logout is enforced by the Next.js BFF clearing
   * the cookies; this endpoint exists so the BFF has a single place to call and
   * so a service-role revoke can be added later without changing the contract.
   */
  @Post("logout")
  async logout(@Body() body: RefreshBody): Promise<{ ok: true }> {
    const refreshToken =
      typeof body?.refresh_token === "string" ? body.refresh_token.trim() : undefined;
    await this.supabase.signOut(refreshToken);
    return { ok: true };
  }
}
