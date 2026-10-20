import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { SupabaseAuthService } from "./supabase-auth.service";

@Module({
  controllers: [AuthController],
  providers: [SupabaseAuthService],
  exports: [SupabaseAuthService],
})
export class AuthModule {}
