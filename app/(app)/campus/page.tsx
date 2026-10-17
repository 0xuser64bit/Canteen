import type { Metadata } from "next";
import { EmptyState } from "@/components/empty";
import { Feed } from "@/components/feed";
import { InviteCard } from "@/components/invite";
import {
  PageHeader,
  TopicChips,
  QuestionFilter,
  FeedControls,
} from "@/components/page-header";
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
  const {
    topic: slug,
    unanswered: filter,
    noReplies: repliesFilter,
    sort: requestedSort,
  } = await searchParams;
  const noReplies = repliesFilter === "1";
  const unanswered = filter === "1";
  const sort =
    requestedSort === "closing" || requestedSort === "oldest"
      ? requestedSort
      : unanswered
        ? "oldest"
        : "newest";
  const topic = topicBySlug(typeof slug === "string" ? slug : undefined);
  const [page, university] = await Promise.all([
    getFeed(viewer, {
      scope: { kind: "campus" },
      topic: topic?.id,
      unanswered,
      noReplies,
      sort,
    }),
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
        <QuestionFilter
          base="/campus"
          active={unanswered}
          topic={topic?.slug}
        />
        <TopicChips
          unanswered={unanswered}
          base="/campus"
          active={topic?.slug}
        />
        <FeedControls
          base="/campus"
          topic={topic?.slug}
          unanswered={unanswered}
          noReplies={noReplies}
          sort={sort}
        />
      </PageHeader>
      {small && (
        <InviteCard
          university={viewer.university.name}
          members={university?.memberCount ?? 1}
          goal={MIN_MEMBERS_TO_NAME_UNIVERSITY}
        />
      )}
      <Feed
        key={`${topic?.slug ?? "all"}:${unanswered}:${noReplies}:${sort}`}
        unanswered={unanswered}
        noReplies={noReplies}
        sort={sort}
        initial={page}
        scope="campus"
        topic={topic?.slug}
        empty={
          <EmptyState
            // Keep one primary invitation while the campus is small.
            action={!small}
            title={
              unanswered ? "No questions waiting" : "Your campus is waiting"
            }
            body={
              unanswered
                ? "Every question here has a helpful reply, or nobody has asked yet. Start with something you need help with."
                : `Nobody from ${viewer.university.name} has posted${topic ? ` in ${topic.label}` : ""} yet. Campus posts are visible to your university and explicitly assigned Canteen hosts.`
            }
            topic={topic?.slug}
          />
        }
      />
    </>
  );
}
