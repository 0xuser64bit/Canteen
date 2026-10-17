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
  getCampusSize,
  getFeed,
  MIN_MEMBERS_TO_NAME_UNIVERSITY,
} from "@/server/queries";

export const metadata: Metadata = { title: "Everyone" };

export default async function HomePage({ searchParams }: PageProps<"/home">) {
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
  const opportunities = topic?.id === "OPPORTUNITIES";

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
        <QuestionFilter base="/home" active={unanswered} topic={topic?.slug} />
        <TopicChips unanswered={unanswered} base="/home" active={topic?.slug} />
        <FeedControls
          base="/home"
          topic={topic?.slug}
          unanswered={unanswered}
          noReplies={noReplies}
          sort={sort}
        />
      </PageHeader>
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
              unanswered
                ? "No questions waiting"
                : opportunities
                  ? "No opportunities yet"
                  : topic
                    ? `Nothing in ${topic.label} yet`
                    : "It's quiet in here"
            }
            body={
              opportunities
                ? "Spotted an internship, hackathon, or scholarship? Share it and help someone land it."
                : "Ask the question you'd never ask under your own name. Students from every university can answer."
            }
            topic={topic?.slug}
          />
        }
      />
    </>
  );
}
