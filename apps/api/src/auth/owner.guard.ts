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
import { verifyToken } from "./tokens";

interface OwnerRequest extends Request {
  ownerId?: string;
}

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<OwnerRequest>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing token");
    }

    let sub: string | undefined;
    try {
      const payload = await verifyToken(header.slice(7).trim());
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    const ownerId = process.env.OWNER_USER_ID;
    if (!ownerId || sub !== ownerId) {
      throw new ForbiddenException("Not the owner");
    }
    req.ownerId = sub;
    return true;
  }
}
