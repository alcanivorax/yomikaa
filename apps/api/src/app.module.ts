import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { OwnerGuard } from "./auth/owner.guard";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import { DraftModule } from "./draft/draft.module";
import { HealthModule } from "./health/health.module";
import { JournalModule } from "./journal/journal.module";
import { NotesModule } from "./notes/notes.module";
import { PrismaModule } from "./prisma/prisma.module";
import { StatsModule } from "./stats/stats.module";
import { TagsModule } from "./tags/tags.module";
import { TicketsModule } from "./tickets/tickets.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuthModule,
    NotesModule,
    TagsModule,
    StatsModule,
    HealthModule,
    JournalModule,
    TicketsModule,
    DraftModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OwnerGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
