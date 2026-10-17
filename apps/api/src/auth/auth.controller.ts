import {
  Body,
  Controller,
  NotFoundException,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { Public } from "./public.decorator";
import { mintDevToken } from "./tokens";

/**
 * Development-only convenience: mints an owner token without Supabase.
 * Disabled unless AUTH_DEV_SECRET is set; see DEVIATIONS.md.
 */
@Controller("auth")
export class AuthController {
  @Public()
  @Post("dev-token")
  devToken(@Body() body: { secret?: string }): { token: string } {
    const secret = process.env.AUTH_DEV_SECRET;
    const ownerId = process.env.OWNER_USER_ID;
    if (!secret || !ownerId) {
      throw new NotFoundException();
    }
    if (body?.secret !== secret) {
      throw new UnauthorizedException("Bad secret");
    }
    return { token: mintDevToken(secret, ownerId) };
  }
}
