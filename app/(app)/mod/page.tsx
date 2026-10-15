import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModQueue } from "@/components/mod-queue";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/lib/session";
import { getModQueue, isModerator } from "@/server/queries";

export const metadata: Metadata = { title: "Moderation" };

export default async function ModerationPage() {
  const viewer = await requireViewer();
  if (!isModerator(viewer)) notFound();
  const items = await getModQueue(viewer);

  return (
    <>
      <PageHeader
        title="Moderation"
        subtitle="You see what was said, never who said it."
      />
      <ModQueue items={items} />
    </>
  );
}
