import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Thin wrapper around the Supabase Auth REST API for the single-owner flows:
 * password sign-in and refresh-token exchange. Uses the public anon/publishable
 * key only — no service-role key is required (or used) anywhere here. The client
 * is created lazily so the app can boot without Supabase configured (e.g. for
 * public reads in tests).
 */
@Injectable()
export class SupabaseAuthService {
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (!this.client) {
      const url = process.env.SUPABASE_URL;
      const anonKey =
        process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !anonKey) {
        throw new UnauthorizedException("Supabase is not configured");
      }
      this.client = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return this.client;
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.getClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session?.access_token) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return toSession(data.session);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await this.getClient().auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session?.access_token) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    return toSession(data.session);
  }

  /**
   * Best-effort server-side sign-out. With only the anon key we cannot revoke an
   * arbitrary session, so logout is ultimately enforced by clearing the cookies
   * in the Next.js BFF; the short-lived access token expires on its own.
   */
  async signOut(_refreshToken?: string): Promise<void> {
    /* no-op: revocation requires the service role, which we deliberately avoid */
  }
}

function toSession(session: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}): AuthSession {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? 3600,
  };
}
