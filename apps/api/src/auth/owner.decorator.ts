import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/** Injects the verified owner id set by `OwnerGuard`. */
export const Owner = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest().ownerId,
);
