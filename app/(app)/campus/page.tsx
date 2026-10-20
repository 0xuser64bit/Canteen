import type { Metadata } from "next";
import { EmptyState } from "@/components/empty";
import { Feed } from "@/components/feed";
import { InviteCard } from "@/components/invite";
import { NavigationLink as Link } from "@/components/navigation-link";
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
  const topic = topicBySlug(typeof slug === "string" ? slug : undefined);
  const opportunities = topic?.id === "OPPORTUNITIES";
  const noReplies = !opportunities && repliesFilter === "1";
  const unanswered = !opportunities && filter === "1";
  const sort =
    requestedSort === "newest"
      ? "newest"
      : requestedSort === "closing" && opportunities
        ? "closing"
        : unanswered
          ? "oldest"
          : "newest";
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
        {!opportunities && (
          <QuestionFilter
            base="/campus"
            active={unanswered}
            topic={topic?.slug}
          />
        )}
        <TopicChips
          unanswered={unanswered}
          noReplies={noReplies}
          sort={sort}
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
      {small && page.items.length > 0 && (
        <InviteCard
          compact
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
            title={
              noReplies
                ? "No questions without replies"
                : unanswered
                  ? "No questions waiting"
                  : opportunities
                    ? "No open opportunities"
                    : topic
                      ? `Nothing in ${topic.label} yet`
                      : "Your campus is waiting"
            }
            body={
              <>
                {noReplies
                  ? `No questions${topic ? ` in ${topic.label}` : ""} on your campus are waiting for their first reply right now.`
                  : unanswered
                    ? `No questions${topic ? ` in ${topic.label}` : ""} on your campus are waiting for a helpful reply right now.`
                    : opportunities
                      ? "No open opportunities match this topic on your campus. Share an internship, hackathon, or scholarship with your classmates."
                      : topic
                        ? "No campus posts match this topic right now. Try another topic or start a conversation."
                        : `No posts to read yet. Campus posts are visible to ${viewer.university.name} and explicitly assigned Canteen hosts.`}
                {(topic || unanswered || noReplies) && (
                  <span className="mt-3 block">
                    <Link
                      href="/campus"
                      className="font-semibold text-ink underline"
                    >
                      Clear filters
                    </Link>
                  </span>
                )}
              </>
            }
            topic={topic?.slug}
          />
        }
      />
      {small && page.items.length === 0 && (
        <InviteCard
          university={viewer.university.name}
          members={university?.memberCount ?? 1}
          goal={MIN_MEMBERS_TO_NAME_UNIVERSITY}
        />
      )}
    </>
  );
}
