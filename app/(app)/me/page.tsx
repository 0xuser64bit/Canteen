import type { Metadata } from "next";
import { Suspense } from "react";
import { Feed } from "@/components/feed";
import { NavigationLink as Link } from "@/components/navigation-link";
import { FeedControls } from "@/components/page-header";
import { requireViewer } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getFeed, type FeedSort } from "@/server/queries";
import Loading from "./loading";

export const metadata: Metadata = { title: "You" };

type Collection = "mine" | "saved" | "following";

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const {
    collection: requested,
    topic: requestedTopic,
    sort: requestedSort,
  } = await searchParams;
  const opportunities = requestedTopic === "opportunities";
  const sort = requestedSort === "closing" ? "closing" : "newest";
  const collection =
    requested === "saved" || requested === "following" ? requested : "mine";

  return (
    <section aria-labelledby="your-posts">
      <h2 id="your-posts" className="text-[15px] font-bold">
        {collection === "saved"
          ? "Saved privately"
          : collection === "following"
            ? "Following replies"
            : "Your posts"}
      </h2>
      <nav
        aria-label="Your collections"
        className="my-1 flex gap-2 text-[13px]"
      >
        {(["mine", "saved", "following"] as const).map((item) => (
          <Link
            scroll={false}
            prefetch={true}
            key={item}
            href={`/me?collection=${item}`}
            aria-current={collection === item ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center px-2 transition-colors",
              collection === item ? "font-bold" : "text-muted hover:text-ink",
            )}
          >
            {item === "mine"
              ? "Posts"
              : item === "saved"
                ? "Saved"
                : "Following"}
          </Link>
        ))}
      </nav>
      {collection === "saved" && (
        <nav
          aria-label="Saved content"
          className="mt-2 mb-3 flex flex-wrap gap-2 text-[13px]"
        >
          <Link
            scroll={false}
            prefetch={true}
            aria-current={!opportunities ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-full px-4 font-semibold transition-colors",
              !opportunities
                ? "bg-ink text-background"
                : "bg-surface text-muted ring-1 ring-line hover:bg-surface-2 hover:text-ink",
            )}
            href="/me?collection=saved"
          >
            All saved
          </Link>
          <Link
            scroll={false}
            prefetch={true}
            aria-current={opportunities ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-full px-4 font-semibold transition-colors",
              opportunities
                ? "bg-ink text-background"
                : "bg-surface text-muted ring-1 ring-line hover:bg-surface-2 hover:text-ink",
            )}
            href="/me?collection=saved&topic=opportunities&sort=closing"
          >
            Opportunities
          </Link>
        </nav>
      )}
      {opportunities && (
        <FeedControls
          base="/me"
          collection={collection}
          topic="opportunities"
          sort={sort}
        />
      )}
      <div className="-mx-4 lg:-mx-6">
        <Suspense
          key={`${collection}:${opportunities}:${sort}`}
          fallback={<Loading />}
        >
          <CollectionFeed
            collection={collection}
            opportunities={opportunities}
            sort={sort}
          />
        </Suspense>
      </div>
    </section>
  );
}

async function CollectionFeed({
  collection,
  opportunities,
  sort,
}: {
  collection: Collection;
  opportunities: boolean;
  sort: FeedSort;
}) {
  const viewer = await requireViewer();
  const posts = await getFeed(viewer, {
    scope: { kind: collection },
    topic: opportunities ? "OPPORTUNITIES" : undefined,
    sort,
  });
  return (
    <Feed
      key={`${collection}:${opportunities}:${sort}`}
      topic={opportunities ? "opportunities" : undefined}
      sort={sort}
      initial={posts}
      scope={collection}
      empty={
        <div className="px-4 py-8 lg:px-6">
          <h3 className="text-[17px] font-semibold">
            {opportunities
              ? sort === "closing"
                ? "No opportunities closing soon"
                : "No opportunities here yet"
              : collection === "mine"
                ? "No posts to show yet"
                : collection === "saved"
                  ? "Save a conversation for later"
                  : "Keep a thread close"}
          </h3>
          <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-muted">
            {opportunities
              ? sort === "closing"
                ? "No opportunities in this collection have an upcoming deadline. Switch to all posts to include other topics and closed opportunities."
                : "No opportunities you can still access appear in this collection. You can switch back to all posts."
              : collection === "mine"
                ? "Your posts show up here. Only you can see that they're yours. Start with something you'd like to ask your campus."
                : collection === "saved"
                  ? "Choose Save privately from a post's menu to keep it here. Only you can see your saved posts."
                  : "Choose Follow replies from another student's post menu. Those threads appear here, and you'll get reply alerts when someone joins in."}
          </p>
          <Link
            href={
              opportunities
                ? `/me?collection=${collection}`
                : collection === "mine"
                  ? "/new"
                  : "/campus"
            }
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-ink underline"
          >
            {opportunities
              ? collection === "saved"
                ? "All saved posts"
                : collection === "following"
                  ? "All followed threads"
                  : "All your posts"
              : collection === "mine"
                ? "Ask a question"
                : "Find a conversation"}
          </Link>
        </div>
      }
    />
  );
}
