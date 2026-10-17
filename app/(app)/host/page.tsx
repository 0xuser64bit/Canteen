import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Feed } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/session";
import { topicBySlug } from "@/lib/topics";
import { getFeed, isModerator } from "@/server/queries";
import { getWaitingSummary } from "@/server/operations";
import { DateTime } from "@/components/time";

export const metadata: Metadata = { title: "Campus hosting" };

export default async function HostPage({ searchParams }: PageProps<"/host">) {
  const viewer = await requireViewer();
  if (!isModerator(viewer)) notFound();
  const {
    campus: slug,
    topic: topicSlug,
    noReplies: requestedFilter,
  } = await searchParams;
  const campuses = viewer.hostCampuses ?? [];
  const campus = slug
    ? campuses.find((item) => item.slug === slug)
    : campuses[0];
  if (slug && !campus) notFound();
  const topic = topicBySlug(
    typeof topicSlug === "string" ? topicSlug : undefined,
  );
  const noReplies = requestedFilter === "1";
  const [page, waiting] = campus
    ? await Promise.all([
        getFeed(viewer, {
          scope: { kind: "university", universityId: campus.id },
          unanswered: true,
          noReplies,
          sort: "oldest",
          topic: topic?.id,
        }),
        getWaitingSummary(viewer, campus.id),
      ])
    : [null, null];
  return (
    <>
      <PageHeader
        title="Campus hosting"
        subtitle="Assigned campuses only · questions waiting for useful help"
        actions={
          campus ? (
            <Button asChild>
              <Link href={`/new?campus=${campus.slug}`}>
                <span className="sm:hidden">Ask</span>
                <span className="hidden sm:inline">Ask on campus</span>
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="px-4 py-4 lg:px-6">
        <nav
          aria-label="Assigned campuses"
          className="flex flex-wrap gap-3 text-[13px]"
        >
          {campuses.map((item) => (
            <Link
              key={item.slug}
              href={`/host?campus=${item.slug}`}
              className={
                item.id === campus?.id
                  ? "font-semibold underline"
                  : "text-muted"
              }
            >
              {item.name}
            </Link>
          ))}
        </nav>
        {campus ? (
          <form
            className="mt-4 flex flex-wrap items-end gap-3 text-[13px]"
            action="/host"
          >
            <input type="hidden" name="campus" value={campus.slug} />
            <label className="flex flex-col gap-1">
              Topic
              <select
                name="topic"
                defaultValue={topic?.slug ?? ""}
                className="rounded-xl bg-surface p-2 ring-1 ring-line"
              >
                <option value="">All topics</option>
                {[
                  "general",
                  "academics",
                  "campus-life",
                  "careers",
                  "mental-health",
                  "opportunities",
                ].map((value) => (
                  <option key={value} value={value}>
                    {topicBySlug(value)?.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                name="noReplies"
                value="1"
                defaultChecked={noReplies}
              />
              No replies yet
            </label>
            <Button type="submit" variant="secondary">
              Filter questions
            </Button>
          </form>
        ) : (
          <p className="mt-3 text-[14px] text-muted">
            No campuses are assigned to this account. Agree a campus owner and
            coverage hours before inviting students.
          </p>
        )}
        <p className="mt-4 max-w-prose text-[13px] leading-relaxed text-muted">
          Reply where you have useful knowledge. Your contributions are labeled
          Canteen team. Do not promise a response time or mark an answer helpful
          for its author.
        </p>
        {waiting && (
          <p className="mt-3 text-[13px] text-muted">
            {waiting.count} campus questions awaiting helpful answers · oldest
            asked <DateTime date={waiting.oldest} />
          </p>
        )}
      </div>
      {page && campus && (
        <Feed
          key={`${campus.id}:${topic?.slug}:${noReplies}`}
          initial={page}
          scope={`university:${campus.slug}`}
          topic={topic?.slug}
          unanswered
          noReplies={noReplies}
          sort="oldest"
          empty={
            <p className="px-4 py-6 text-[14px] text-muted">
              No questions waiting in this view.
            </p>
          }
        />
      )}
    </>
  );
}
