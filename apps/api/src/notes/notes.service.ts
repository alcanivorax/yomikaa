import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  excerpt,
  matchQ,
  slug,
  sortNotes,
  type Kind,
  type NoteCreateInput,
  type NoteDto,
  type NotePatchInput,
  type SortKey,
} from "@marginalia/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toDate, toKey } from "../common/dates";

interface NoteRow {
  id: number;
  title: string;
  kind: string;
  excerpt: string;
  body: string[];
  margin: string | null;
  url: string | null;
  date: Date;
  isSample: boolean;
  tags: { slug: string }[];
}

export interface NotesQuery {
  q?: string;
  kind?: "All" | Kind;
  tag?: string;
  sort?: SortKey;
}

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(n: NoteRow): NoteDto {
    return {
      id: n.id,
      title: n.title,
      kind: n.kind as Kind,
      tags: n.tags.map((t) => t.slug),
      date: toKey(n.date),
      ex: n.excerpt,
      body: n.body,
      m: n.margin ?? undefined,
      url: n.url ?? undefined,
      sample: n.isSample,
    };
  }

  private tagSlugs(tags: string[]): string[] {
    return [...new Set(tags.map(slug).filter(Boolean))];
  }

  private async cleanupTags(): Promise<void> {
    await this.prisma.tag.deleteMany({ where: { notes: { none: {} } } });
  }

  private validate(kind: string, body: string[], url: string | undefined): void {
    if (!body.length && !(kind === "Link" && url))
      throw new BadRequestException("Write something first.");
    if (kind === "Link" && !/^https?:\/\//i.test(url ?? ""))
      throw new BadRequestException(
        "A link needs a full address, starting with http.",
      );
  }

  async list(query: NotesQuery): Promise<NoteDto[]> {
    const rows = (await this.prisma.note.findMany({
      include: { tags: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    })) as unknown as NoteRow[];

    let dtos = rows.map((r) => this.toDto(r));
    if (query.kind && query.kind !== "All")
      dtos = dtos.filter((n) => n.kind === query.kind);
    if (query.tag) dtos = dtos.filter((n) => n.tags.includes(query.tag!));
    if (query.q)
      dtos = dtos.filter((n) => matchQ(n as never, query.q as string));
    return sortNotes(dtos as never, query.sort ?? "new") as NoteDto[];
  }

  async get(id: number): Promise<NoteDto> {
    const row = (await this.prisma.note.findUnique({
      where: { id },
      include: { tags: true },
    })) as unknown as NoteRow | null;
    if (!row) throw new NotFoundException("Note not found");
    return this.toDto(row);
  }

  async create(input: NoteCreateInput): Promise<NoteDto> {
    const kind = input.kind;
    const url = kind === "Link" ? input.url?.trim() : undefined;
    this.validate(kind, input.body, url);
    const slugs = this.tagSlugs(input.tags);
    const row = (await this.prisma.note.create({
      data: {
        title: input.title.trim() || "Untitled",
        kind,
        excerpt: excerpt(input.body, input.url ?? ""),
        body: input.body,
        margin: input.m?.trim() || null,
        url: url || null,
        date: toDate(input.date),
        isSample: false,
        tags: {
          connectOrCreate: slugs.map((s) => ({
            where: { slug: s },
            create: { slug: s },
          })),
        },
      },
      include: { tags: true },
    })) as unknown as NoteRow;
    return this.toDto(row);
  }

  async update(id: number, input: NotePatchInput): Promise<NoteDto> {
    const existing = (await this.prisma.note.findUnique({
      where: { id },
    })) as unknown as NoteRow | null;
    if (!existing) throw new NotFoundException("Note not found");
    if (existing.isSample)
      throw new ForbiddenException("Sample notes are read-only");

    const kind = input.kind;
    const url = kind === "Link" ? input.url?.trim() : undefined;
    this.validate(kind, input.body, url);
    const slugs = this.tagSlugs(input.tags);

    const row = (await this.prisma.note.update({
      where: { id },
      data: {
        title: input.title.trim() || "Untitled",
        kind,
        excerpt: excerpt(input.body, input.url ?? ""),
        body: input.body,
        margin: input.m?.trim() || null,
        url: url || null,
        tags: {
          set: [],
          connectOrCreate: slugs.map((s) => ({
            where: { slug: s },
            create: { slug: s },
          })),
        },
      },
      include: { tags: true },
    })) as unknown as NoteRow;

    await this.cleanupTags();
    return this.toDto(row);
  }
}
