import {
  Body,
  Controller,
  Get,
  Param,
  Put,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import {
  journalDaySchema,
  type JournalDay,
  type JournalDayInput,
} from "@marginalia/shared";
import { Owner } from "../auth/owner.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JournalService } from "./journal.service";

const ymSchema = z.string().regex(/^\d{4}-\d\d$/, "Expected YYYY-MM");
const yearSchema = z.string().regex(/^\d{4}$/, "Expected YYYY");
const dateSchema = z.string().regex(/^\d{4}-\d\d-\d\d$/, "Expected YYYY-MM-DD");

@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller("journal")
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Get("months/:ym")
  month(
    @Owner() ownerId: string,
    @Param("ym", new ZodValidationPipe(ymSchema)) ym: string,
  ): Promise<{ days: Record<string, JournalDay> }> {
    return this.journal.month(ownerId, ym);
  }

  @Get("years/:y/counts")
  counts(
    @Owner() ownerId: string,
    @Param("y", new ZodValidationPipe(yearSchema)) y: string,
  ): Promise<Record<string, number>> {
    return this.journal.yearCounts(ownerId, y);
  }

  @Get("days/:date")
  day(
    @Owner() ownerId: string,
    @Param("date", new ZodValidationPipe(dateSchema)) date: string,
  ): Promise<JournalDay> {
    return this.journal.day(ownerId, date);
  }

  @Put("days/:date")
  putDay(
    @Owner() ownerId: string,
    @Param("date", new ZodValidationPipe(dateSchema)) date: string,
    @Body(new ZodValidationPipe(journalDaySchema)) body: JournalDayInput,
  ): Promise<JournalDay> {
    return this.journal.putDay(ownerId, date, body);
  }
}
