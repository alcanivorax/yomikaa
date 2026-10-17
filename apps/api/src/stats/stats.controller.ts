import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../auth/public.decorator";
import { verifyToken } from "../auth/tokens";
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
    const header = req.headers.authorization;
    const expected = process.env.OWNER_USER_ID;
    if (!header?.startsWith("Bearer ") || !expected) return undefined;
    try {
      const payload = await verifyToken(header.slice(7).trim());
      return payload.sub === expected ? expected : undefined;
    } catch {
      return undefined;
    }
  }
}
