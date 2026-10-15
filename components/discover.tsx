import { Flame, GitFork, School } from "lucide-react";
import Link from "next/link";
import { requireViewer } from "@/lib/session";
import { repoUrl } from "@/lib/site";
import { plural } from "@/lib/utils";
import { getActiveUniversities, getTrending } from "@/server/queries";

export async function Discover() {
  const viewer = await requireViewer();
  const [trending, universities] = await Promise.all([
    getTrending(viewer),
    getActiveUniversities(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="trending">
        <h2
          id="trending"
          className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-muted"
        >
          <Flame className="size-4" /> Trending this week
        </h2>
        {trending.length === 0 ? (
          <p className="text-[14px] leading-relaxed text-muted">
            Nothing yet. The first good question this week ends up here.
          </p>
        ) : (
          <ol className="flex flex-col gap-1">
            {trending.map((post, index) => (
              <li key={post.id}>
                <Link
                  href={`/p/${post.id}`}
                  className="group -mx-2.5 flex gap-3 rounded-2xl p-2.5 transition-colors hover:bg-surface-3"
                >
                  <span className="w-4 shrink-0 pt-0.5 text-[13px] font-bold text-muted tabular">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[14px] leading-snug font-semibold">
                      {post.title}
                    </span>
                    <span className="mt-1 block text-[12px] text-muted tabular">
                      {plural(post.likeCount, "like")} ·{" "}
                      {plural(post.commentCount, "reply", "replies")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {universities.length > 0 && (
        <section aria-labelledby="campuses">
          <h2
            id="campuses"
            className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-muted"
          >
            <School className="size-4" /> Busy campuses
          </h2>
          <ul className="flex flex-col gap-1">
            {universities.map((u) => (
              <li key={u.slug}>
                <Link
                  href={`/u/${u.slug}`}
                  className="-mx-2.5 flex items-center justify-between gap-3 rounded-2xl p-2.5 text-[14px] font-medium transition-colors hover:bg-surface-3"
                >
                  <span className="truncate">{u.name}</span>
                  <span className="shrink-0 text-[12px] text-muted tabular">
                    {plural(u.postCount, "post")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl bg-surface-2 p-5 ring-1 ring-line">
        <p className="text-[14px] leading-relaxed text-muted">
          Every name you see is an alias for one thread only. Your university is
          the only thing that travels with you, and only once enough classmates
          have joined.
        </p>
        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold hover:underline"
        >
          <GitFork className="size-4" /> Canteen is open source
        </a>
      </section>
    </div>
  );
}
