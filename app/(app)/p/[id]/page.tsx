import { notFound } from "next/navigation";
import { ThreadView } from "@/components/thread";
import { requireViewer } from "@/lib/session";
import { getThread } from "@/server/queries";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/p/[id]">) {
  const viewer = await requireViewer();
  const { before, reply } = await searchParams;
  const thread = await getThread(
    viewer,
    (await params).id,
    typeof before === "string" && before.length <= 128 ? before : undefined,
    typeof reply === "string" && reply.length <= 64 ? reply : undefined,
  );
  return { title: thread?.title ?? "Thread not found" };
}

export default async function ThreadPage({
  params,
  searchParams,
}: PageProps<"/p/[id]">) {
  const viewer = await requireViewer();
  const { before, reply } = await searchParams;
  const thread = await getThread(
    viewer,
    (await params).id,
    typeof before === "string" && before.length <= 128 ? before : undefined,
    typeof reply === "string" && reply.length <= 64 ? reply : undefined,
  );
  if (!thread) notFound();
  return <ThreadView key={thread.id} thread={thread} />;
}
