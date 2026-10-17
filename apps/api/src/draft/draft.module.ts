import { Module } from "@nestjs/common";
import { DraftController } from "./draft.controller";

@Module({
  controllers: [DraftController],
})
export class DraftModule {}
