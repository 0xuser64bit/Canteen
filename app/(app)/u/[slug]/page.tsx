import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty";
import { Feed } from "@/components/feed";
import { PageHeader, TopicChips } from "@/components/page-header";
import { requireViewer } from "@/lib/session";
import { topicBySlug } from "@/lib/topics";
import { countryName } from "@/lib/countries";
import { plural } from "@/lib/utils";
import { getFeed, getUniversityPage } from "@/server/queries";

export async function generateMetadata({ params }: PageProps<"/u/[slug]">) {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function UniversityPage({
  params,
  searchParams,
}: PageProps<"/u/[slug]">) {
  const viewer = await requireViewer();
  const [{ slug }, { topic: topicSlug }] = await Promise.all([
    params,
    searchParams,
  ]);
  const university = await getUniversityPage(viewer, slug);
  if (!university) notFound();

  const topic = topicBySlug(
    typeof topicSlug === "string" ? topicSlug : undefined,
  );
  const page = await getFeed(viewer, {
    scope: { kind: "university", universityId: university.id },
    topic: topic?.id,
  });

  return (
    <>
      <PageHeader
        title={university.name}
        subtitle={
          <>
            {countryName(university.countryCode)} ·{" "}
            {plural(university.memberCount, "student")}
            {university.isMine && " · your campus"}
          </>
        }
        actions={
          university.website && (
            <a
              href={university.website}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-ink sm:flex"
            >
              Website <ExternalLink className="size-3.5" />
            </a>
          )
        }
      >
        <TopicChips base={`/u/${university.slug}`} active={topic?.slug} />
      </PageHeader>
      <Feed
        key={topic?.slug ?? "all"}
        initial={page}
        scope={`university:${university.slug}`}
        topic={topic?.slug}
        empty={
          <EmptyState
            title={`No posts from ${university.name} yet`}
            body={
              university.isMine
                ? "You could be the first. Pick My campus as the audience to keep it between classmates."
                : "When its students post for everyone, you'll find them here."
            }
            action={university.isMine}
            topic={topic?.slug}
          />
        }
      />
    </>
  );
}
