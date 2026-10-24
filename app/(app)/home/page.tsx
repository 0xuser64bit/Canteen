import type { Metadata } from "next";
import { TrendingStrip } from "@/components/discover";
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
  getCampusSize,
  getFeed,
  MIN_MEMBERS_TO_NAME_UNIVERSITY,
} from "@/server/queries";

export async function generateMetadata({
  searchParams,
}: PageProps<"/home">): Promise<Metadata> {
  const { topic } = await searchParams;
  return { title: topic === "opportunities" ? "Opportunities" : "Everyone" };
}

export default async function HomePage({ searchParams }: PageProps<"/home">) {
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
  const [page, campusSize] = await Promise.all([
    getFeed(viewer, {
      scope: { kind: "everyone" },
      topic: topic?.id,
      unanswered,
      noReplies,
      sort,
    }),
    viewer.university.slug === TEAM.slug ? null : getCampusSize(viewer),
  ]);

  return (
    <>
      <PageHeader
        title={opportunities ? "Opportunities" : "Everyone"}
        subtitle={
          opportunities
            ? "Internships, jobs, hackathons, and scholarships shared by students"
            : "Verified students from every university"
        }
      >
        {!opportunities && (
          <QuestionFilter
            base="/home"
            active={unanswered}
            topic={topic?.slug}
          />
        )}
        <TopicChips
          unanswered={unanswered}
          noReplies={noReplies}
          sort={sort}
          base="/home"
          active={topic?.slug}
        />
        <FeedControls
          base="/home"
          topic={topic?.slug}
          unanswered={unanswered}
          noReplies={noReplies}
          sort={sort}
        />
      </PageHeader>
      {!topic && !unanswered && !noReplies && <TrendingStrip />}
      {campusSize !== null && campusSize < MIN_MEMBERS_TO_NAME_UNIVERSITY && (
        <InviteCard
          compact
          university={viewer.university.name}
          members={campusSize}
          goal={MIN_MEMBERS_TO_NAME_UNIVERSITY}
        />
      )}
      <Feed
        key={`${topic?.slug ?? "all"}:${unanswered}:${noReplies}:${sort}`}
        unanswered={unanswered}
        noReplies={noReplies}
        sort={sort}
        initial={page}
        scope="everyone"
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
                      : "It's quiet in here"
            }
            body={
              <>
                {noReplies
                  ? `No questions${topic ? ` in ${topic.label}` : ""} are waiting for their first reply right now.`
                  : unanswered
                    ? `No questions${topic ? ` in ${topic.label}` : ""} are waiting for a helpful reply right now.`
                    : opportunities
                      ? "Spotted an internship, hackathon, or scholarship? Share it and help someone land it."
                      : topic
                        ? "No posts match this topic right now. Try another topic or start a conversation."
                        : "Ask the question you'd never ask under your own name. Choose Every university when posting to invite answers from across campuses."}
                {(topic || unanswered || noReplies) && (
                  <span className="mt-3 block">
                    <Link
                      href="/home"
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
    </>
  );
}
