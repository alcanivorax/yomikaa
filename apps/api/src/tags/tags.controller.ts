import { Controller, Get } from "@nestjs/common";
import type { TagDto } from "@marginalia/shared";
import { Public } from "../auth/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("tags")
export class TagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list(): Promise<TagDto[]> {
    const tags = await this.prisma.tag.findMany({
      orderBy: { slug: "asc" },
      select: { slug: true, _count: { select: { notes: true } } },
    });
    return tags.map((t) => ({ slug: t.slug, count: t._count.notes }));
  }
}
