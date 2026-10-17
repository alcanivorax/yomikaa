import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

interface PrismaLikeError {
  code?: string;
  message?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        res.status(status).json({ statusCode: status, message: body });
      } else {
        const b = body as Record<string, unknown>;
        res.status(status).json({
          statusCode: status,
          message: b.message ?? exception.message,
          ...(b.errors ? { errors: b.errors } : {}),
        });
      }
      return;
    }

    const prismaErr = exception as PrismaLikeError;
    if (prismaErr?.code === "P2025") {
      res
        .status(HttpStatus.NOT_FOUND)
        .json({ statusCode: 404, message: "Not found" });
      return;
    }
    if (prismaErr?.code === "P2002") {
      res
        .status(HttpStatus.CONFLICT)
        .json({ statusCode: 409, message: "Conflict" });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, message: "Internal server error" });
  }
}
