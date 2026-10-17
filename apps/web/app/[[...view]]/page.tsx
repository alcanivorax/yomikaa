import { SAMPLE_NOTES } from "@marginalia/shared";
import { fetchNotesServer } from "@/lib/api";
import type { NoteLike } from "@/lib/app-context";
import { Shell } from "@/components/Shell";
import { viewFromSlug } from "@/lib/view";

export const dynamic = "force-dynamic";

const sampleNotes: NoteLike[] = SAMPLE_NOTES.map((n, i) => ({
  ...n,
  id: i,
  sample: true,
}));

export default async function Page({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}) {
  const { view } = await params;
  const initialNotes = (await fetchNotesServer()) ?? sampleNotes;

  return <Shell initialView={viewFromSlug(view)} initialNotes={initialNotes} />;
}
