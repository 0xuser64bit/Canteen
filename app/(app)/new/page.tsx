import type { Metadata } from "next";
import { Composer } from "@/components/composer";
import { isEmailEnabled } from "@/lib/auth";
import { getDraftOwner, requireViewer } from "@/lib/session";
import { topicBySlug } from "@/lib/topics";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage({ searchParams }: PageProps<"/new">) {
  const viewer = await requireViewer();
  const draftOwner = await getDraftOwner();
  const { topic, campus } = await searchParams;
  const hostCampus = campus
    ? viewer.hostCampuses?.find((item) => item.slug === campus)
    : undefined;
  if (campus && !hostCampus) notFound();
  return (
    <Composer
      key={`${draftOwner}:${hostCampus?.slug ?? ""}`}
      draftOwner={draftOwner}
      university={hostCampus?.name ?? viewer.university.name}
      hostCampus={hostCampus?.slug}
      initialTopic={
        topicBySlug(typeof topic === "string" ? topic : undefined)?.id ??
        "GENERAL"
      }
      imagesEnabled={Boolean(process.env.BLOB_PRIVATE_READ_WRITE_TOKEN)}
      emailEnabled={isEmailEnabled}
    />
  );
}
