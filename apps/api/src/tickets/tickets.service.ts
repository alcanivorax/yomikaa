import { BadRequestException, Injectable } from "@nestjs/common";
import { usedTicket, type Ticket, type TicketStatus } from "@yomikaa/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toDate, toKey } from "../common/dates";

export interface TicketInput {
  key: string;
  title: string;
  status: TicketStatus;
  date: string;
  note: string;
}

interface TicketRow {
  id: string;
  key: string;
  title: string;
  status: string;
  note: string;
  workedOn: Date;
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(t: TicketRow): Ticket {
    return {
      id: t.id,
      key: t.key,
      title: t.title,
      status: t.status as TicketStatus,
      date: toKey(t.workedOn),
      note: t.note,
    };
  }

  async list(ownerId: string): Promise<Ticket[]> {
    const rows = (await this.prisma.ticket.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    })) as unknown as TicketRow[];
    return rows.map((r) => this.toDto(r));
  }

  /** Returns the stored ticket, or null when an unused ticket was removed. */
  async upsert(
    ownerId: string,
    id: string,
    input: TicketInput,
  ): Promise<Ticket | null> {
    if (input.date > toKey(new Date())) {
      throw new BadRequestException("Future dates are not allowed");
    }
    if (!usedTicket({ id, ...input })) {
      await this.prisma.ticket.deleteMany({ where: { id, ownerId } });
      return null;
    }
    const row = (await this.prisma.ticket.upsert({
      where: { id },
      create: {
        id,
        ownerId,
        key: input.key,
        title: input.title,
        status: input.status,
        note: input.note,
        workedOn: toDate(input.date),
      },
      update: {
        key: input.key,
        title: input.title,
        status: input.status,
        note: input.note,
        workedOn: toDate(input.date),
      },
    })) as unknown as TicketRow;
    return this.toDto(row);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.prisma.ticket.deleteMany({ where: { id, ownerId } });
  }
}
