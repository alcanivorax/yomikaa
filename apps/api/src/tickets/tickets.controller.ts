import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { ticketSchema, type Ticket } from "@marginalia/shared";
import type { Response } from "express";
import { Owner } from "../auth/owner.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { TicketsService, type TicketInput } from "./tickets.service";

const uuidSchema = z.uuid();
const ticketBodySchema = ticketSchema.omit({ id: true });

@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller("tickets")
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(@Owner() ownerId: string): Promise<Ticket[]> {
    return this.tickets.list(ownerId);
  }

  @Put(":id")
  async upsert(
    @Owner() ownerId: string,
    @Param("id", new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(ticketBodySchema)) body: TicketInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Ticket | undefined> {
    const ticket = await this.tickets.upsert(ownerId, id, body);
    if (!ticket) {
      res.status(204);
      return undefined;
    }
    return ticket;
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @Owner() ownerId: string,
    @Param("id", new ZodValidationPipe(uuidSchema)) id: string,
  ): Promise<void> {
    await this.tickets.remove(ownerId, id);
  }
}
