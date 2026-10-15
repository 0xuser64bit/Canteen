import type { Metadata } from "next";
import { EmptyState } from "@/components/empty";
import { Feed } from "@/components/feed";
import { InviteCard } from "@/components/invite";
import { PageHeader, TopicChips } from "@/components/page-header";
import { requireViewer } from "@/lib/session";
import { topicBySlug } from "@/lib/topics";
import { TEAM } from "@/lib/universities";
import {
  getFeed,
  getUniversityPage,
  MIN_MEMBERS_TO_NAME_UNIVERSITY,
} from "@/server/queries";

export const metadata: Metadata = { title: "My campus" };

export default async function CampusPage({
  searchParams,
}: PageProps<"/campus">) {
  const viewer = await requireViewer();
  const { topic: slug } = await searchParams;
  const topic = topicBySlug(typeof slug === "string" ? slug : undefined);
  const [page, university] = await Promise.all([
    getFeed(viewer, { scope: { kind: "campus" }, topic: topic?.id }),
    getUniversityPage(viewer, viewer.university.slug),
  ]);
  const small =
    viewer.university.slug !== TEAM.slug &&
    (university?.memberCount ?? 0) < MIN_MEMBERS_TO_NAME_UNIVERSITY;

  return (
    <>
      <PageHeader
        title="My campus"
        subtitle={`${viewer.university.name} · campus-only posts stay here`}
      >
        <TopicChips base="/campus" active={topic?.slug} />
      </PageHeader>
      {small && (
        <InviteCard
          university={viewer.university.name}
          members={university?.memberCount ?? 1}
          goal={MIN_MEMBERS_TO_NAME_UNIVERSITY}
        />
      )}
      <Feed
        key={topic?.slug ?? "all"}
        initial={page}
        scope="campus"
        topic={topic?.slug}
        empty={
          <EmptyState
            // The invite card above is this page's one yellow action until it unlocks.
            action={!small}
            title="Your campus is waiting"
            body={`Nobody from ${viewer.university.name} has posted${topic ? ` in ${topic.label}` : ""} yet. Posts set to "My campus" are only visible to your classmates.`}
            topic={topic?.slug}
          />
        }
      />
    </>
  );
}
