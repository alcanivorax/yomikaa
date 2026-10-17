import { SAMPLE_NOTES } from "@marginalia/shared";
import { fetchNotesServer } from "@/lib/api";
import type { NoteLike } from "@/lib/app-context";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

const sampleNotes: NoteLike[] = SAMPLE_NOTES.map((n, i) => ({
  ...n,
  id: i,
  sample: true,
}));

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialNotes = (await fetchNotesServer()) ?? sampleNotes;

  return (
    <Shell initialView="home" initialNotes={initialNotes} initialNote={Number(id)} />
  );
}
