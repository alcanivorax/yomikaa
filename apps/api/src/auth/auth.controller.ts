import {
  Body,
  Controller,
  NotFoundException,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { credentialsConfigured, verifyCredentials } from "./credentials";
import { Public } from "./public.decorator";
import { mintToken } from "./tokens";

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

/**
 * Single-owner username + password sign-in. On success mints an HS256 session
 * token whose subject is OWNER_USER_ID; OwnerGuard accepts nothing else.
 * Disabled (404) unless the owner credentials and OWNER_USER_ID are set.
 */
@Controller("auth")
export class AuthController {
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  async login(@Body() body: LoginBody): Promise<{ token: string }> {
    const ownerId = process.env.OWNER_USER_ID;
    if (!ownerId || !credentialsConfigured()) {
      throw new NotFoundException();
    }

    const username = typeof body?.username === "string" ? body.username : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!(await verifyCredentials(username, password))) {
      throw new UnauthorizedException("Invalid username or password");
    }

    return { token: mintToken(ownerId) };
  }
}
