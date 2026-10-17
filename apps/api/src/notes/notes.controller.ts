import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { z } from "zod";
import {
  kindSchema,
  noteCreateSchema,
  notePatchSchema,
  type NoteDto,
} from "@marginalia/shared";
import { Public } from "../auth/public.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { NotesService, type NotesQuery } from "./notes.service";

const notesQuerySchema = z.object({
  q: z.string().max(200).optional(),
  kind: z.union([z.literal("All"), kindSchema]).optional(),
  tag: z.string().max(64).optional(),
  sort: z.enum(["new", "old", "az"]).optional(),
});

@Controller("notes")
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Public()
  @Get()
  list(
    @Query(new ZodValidationPipe(notesQuerySchema)) query: NotesQuery,
  ): Promise<NoteDto[]> {
    return this.notes.list(query);
  }

  @Public()
  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number): Promise<NoteDto> {
    return this.notes.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(noteCreateSchema)) body: unknown,
  ): Promise<NoteDto> {
    return this.notes.create(body as never);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(notePatchSchema)) body: unknown,
  ): Promise<NoteDto> {
    return this.notes.update(id, body as never);
  }
}
