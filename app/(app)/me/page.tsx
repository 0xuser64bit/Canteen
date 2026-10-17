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
        <nav aria-label="Saved content" className="mb-3 flex gap-4 text-[13px]">
          <Link
            scroll={false}
            prefetch={true}
            className="underline"
            href="/me?collection=saved"
          >
            All saved posts
          </Link>
          <Link
            scroll={false}
            prefetch={true}
            className="underline"
            href="/me?collection=saved&topic=opportunities&sort=closing"
          >
            Saved opportunities closing soon
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
        <p className="px-4 py-6 text-[14px] text-muted lg:px-6">
          {collection === "mine"
            ? "Your posts show up here. Only you can see that they’re yours."
            : "Use a post’s menu to save it or follow its replies. Only posts you can still access appear here."}
        </p>
      }
    />
  );
}
