import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/** Resolves to the data-scoping owner id set by `OwnerGuard` on the request. */
export const Owner = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest().ownerId,
);
