import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { extractAccessToken, verifySupabaseJwt } from "./supabase-jwt";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  ownerId?: string;
}

/**
 * Global guard. For every non-`@Public()` route it:
 *   1. reads the Supabase access token (Authorization header or session cookie),
 *   2. verifies it locally (HS256/RS256) and checks the subject is the owner,
 *   3. sets `req.ownerId` to the data-scoping owner id used in the database.
 *
 * The Supabase auth id (`SUPABASE_OWNER_USER_ID`) and the data-scoping id
 * (`OWNER_USER_ID`) may differ so that existing rows keep working unchanged.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractAccessToken(req);
    if (!token) throw new UnauthorizedException("Missing token");

    let sub: string;
    try {
      const payload = await verifySupabaseJwt(token);
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    const ownerAuthId = process.env.SUPABASE_OWNER_USER_ID;
    if (!ownerAuthId) throw new ForbiddenException("Owner not configured");
    if (sub !== ownerAuthId) throw new ForbiddenException("Not the owner");

    req.userId = sub;
    req.ownerId = process.env.OWNER_USER_ID || ownerAuthId;
    return true;
  }
}
