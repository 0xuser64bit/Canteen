import { notFound } from "next/navigation";
import { ThreadView } from "@/components/thread";
import { requireViewer } from "@/lib/session";
import { getThread } from "@/server/queries";

export async function generateMetadata({ params }: PageProps<"/p/[id]">) {
  const viewer = await requireViewer();
  const thread = await getThread(viewer, (await params).id);
  return { title: thread?.title ?? "Thread not found" };
}

export default async function ThreadPage({ params }: PageProps<"/p/[id]">) {
  const viewer = await requireViewer();
  const thread = await getThread(viewer, (await params).id);
  if (!thread) notFound();
  return <ThreadView key={thread.id} thread={thread} />;
}
