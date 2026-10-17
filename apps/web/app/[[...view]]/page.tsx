import { Shell } from "@/components/Shell";
import { HomeView } from "@/components/views/HomeView";
import { IndexView } from "@/components/views/IndexView";
import { WriteView } from "@/components/views/WriteView";
import { JournalView } from "@/components/views/JournalView";
import { TicketsView } from "@/components/views/TicketsView";
import { viewFromSlug } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}) {
  const { view } = await params;
  return (
    <Shell initialView={viewFromSlug(view)}>
      <HomeView />
      <IndexView />
      <WriteView />
      <JournalView />
      <TicketsView />
    </Shell>
  );
}
