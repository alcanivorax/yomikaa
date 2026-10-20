import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../auth/public.decorator";
import { extractAccessToken, verifySupabaseJwt } from "../auth/supabase-jwt";
import { PrismaService } from "../prisma/prisma.service";

@Controller("stats")
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async stats(
    @Req() req: Request,
  ): Promise<{ notes: number; journalDays?: number }> {
    const notes = await this.prisma.note.count();

    const ownerId = await this.ownerFrom(req);
    if (ownerId) {
      const journalDays = await this.prisma.journalDay.count({
        where: { ownerId },
      });
      return { notes, journalDays };
    }
    return { notes };
  }

  private async ownerFrom(req: Request): Promise<string | undefined> {
    const ownerAuthId = process.env.SUPABASE_OWNER_USER_ID;
    const token = extractAccessToken(req);
    if (!ownerAuthId || !token) return undefined;
    try {
      const payload = await verifySupabaseJwt(token);
      return payload.sub === ownerAuthId
        ? process.env.OWNER_USER_ID || ownerAuthId
        : undefined;
    } catch {
      return undefined;
    }
  }
}
