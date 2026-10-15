import type { Metadata } from "next";
import { Composer } from "@/components/composer";
import { requireViewer } from "@/lib/session";
import { topicBySlug } from "@/lib/topics";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage({ searchParams }: PageProps<"/new">) {
  const viewer = await requireViewer();
  const { topic } = await searchParams;
  return (
    <Composer
      university={viewer.university.name}
      initialTopic={
        topicBySlug(typeof topic === "string" ? topic : undefined)?.id ??
        "GENERAL"
      }
      imagesEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
    />
  );
}
