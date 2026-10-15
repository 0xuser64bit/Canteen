import type { Metadata } from "next";
import { EmptyState } from "@/components/empty";
import { Feed } from "@/components/feed";
import { PageHeader, TopicChips } from "@/components/page-header";
import { requireViewer } from "@/lib/session";
import { topicBySlug } from "@/lib/topics";
import { getFeed } from "@/server/queries";

export const metadata: Metadata = { title: "Everyone" };

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const viewer = await requireViewer();
  const { topic: slug } = await searchParams;
  const topic = topicBySlug(typeof slug === "string" ? slug : undefined);
  const page = await getFeed(viewer, {
    scope: { kind: "everyone" },
    topic: topic?.id,
  });
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
        <TopicChips base="/home" active={topic?.slug} />
      </PageHeader>
      <Feed
        key={topic?.slug ?? "all"}
        initial={page}
        scope="everyone"
        topic={topic?.slug}
        empty={
          <EmptyState
            title={
              opportunities
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
