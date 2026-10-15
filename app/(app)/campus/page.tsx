import type { Metadata } from "next";
import { EmptyState } from "@/components/empty";
import { Feed } from "@/components/feed";
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
        <p className="mx-4 mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-muted ring-1 ring-line lg:mx-6">
          Fewer than {MIN_MEMBERS_TO_NAME_UNIVERSITY} students from your
          university have joined so far. Until more do, other universities see
          your posts as coming from a university in your country, and anonymity
          on this page is thin. Invite a few classmates.
        </p>
      )}
      <Feed
        key={topic?.slug ?? "all"}
        initial={page}
        scope="campus"
        topic={topic?.slug}
        empty={
          <EmptyState
            title="Your campus is waiting"
            body={`Nobody from ${viewer.university.name} has posted${topic ? ` in ${topic.label}` : ""} yet. Posts set to "My campus" are only visible to your classmates.`}
            topic={topic?.slug}
          />
        }
      />
    </>
  );
}
