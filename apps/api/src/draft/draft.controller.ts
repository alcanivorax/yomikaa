import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Put,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { draftSchema, type DraftInput } from "@marginalia/shared";
import type { Response } from "express";
import { Owner } from "../auth/owner.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { PrismaService } from "../prisma/prisma.service";

@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller("draft")
export class DraftController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(
    @Owner() ownerId: string,
    @Res() res: Response,
  ): Promise<void> {
    const row = await this.prisma.draft.findUnique({ where: { ownerId } });
    res.json((row?.data as DraftInput | undefined) ?? null);
  }

  @Put()
  async put(
    @Owner() ownerId: string,
    @Body(new ZodValidationPipe(draftSchema)) body: DraftInput,
  ): Promise<DraftInput> {
    await this.prisma.draft.upsert({
      where: { ownerId },
      create: { ownerId, data: body },
      update: { data: body },
    });
    return body;
  }

  @Delete()
  @HttpCode(204)
  async clear(@Owner() ownerId: string): Promise<void> {
    await this.prisma.draft.deleteMany({ where: { ownerId } });
  }
}
