import {
  BadgeCheck,
  EyeOff,
  ImageOff,
  ShieldCheck,
  Settings2,
  Shuffle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccountButton, SignOutButton } from "@/components/account";
import { Feed } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/session";
import { TEAM } from "@/lib/universities";
import { compactNumber } from "@/lib/utils";
import {
  getAccountStats,
  getFeed,
  getModQueueSize,
  isModerator,
  MIN_MEMBERS_TO_NAME_UNIVERSITY,
} from "@/server/queries";

export const metadata: Metadata = { title: "You" };

const joined = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const requested = (await searchParams).collection;
  const collection =
    requested === "saved" || requested === "following" ? requested : "mine";
  const viewer = await requireViewer();
  const isTeam = viewer.university.slug === TEAM.slug;
  const [stats, posts, modQueue] = await Promise.all([
    getAccountStats(viewer),
    getFeed(viewer, { scope: { kind: collection } }),
    isModerator(viewer) ? getModQueueSize() : undefined,
  ]);

  return (
    <>
      <PageHeader title="You" subtitle="Only you can see this page" />
      <div className="flex flex-col gap-8 px-4 py-6 lg:px-6">
        <section className="rounded-[28px] bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            <BadgeCheck className="size-[18px] text-ink" />{" "}
            {isTeam ? "Team account" : "University email verified"}
          </p>
          <Link
            href={`/u/${viewer.university.slug}`}
            className="mt-2 block text-[24px] leading-tight font-display hover:underline sm:text-[28px]"
          >
            {viewer.university.name}
          </Link>
          <p className="mt-2 text-[14px] text-muted">
            Signed in as{" "}
            <span className="font-medium text-ink">{viewer.email}</span> ·
            joined {joined.format(viewer.createdAt)}
          </p>
          <dl className="mt-5 flex gap-8 border-t border-line pt-5">
            {[
              ["Posts", stats.posts],
              ["Replies", stats.comments],
              ["Likes received", stats.likesReceived],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12px] font-semibold text-muted">
                  {label}
                </dt>
                <dd className="mt-0.5 text-[22px] font-bold tabular">
                  {compactNumber(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
          {modQueue !== undefined && (
            <Button asChild className="mt-5">
              <Link href="/mod">
                <ShieldCheck /> Moderation queue
                {modQueue > 0 && ` · ${modQueue} waiting`}
              </Link>
            </Button>
          )}
        </section>

        <Button asChild>
          <Link href="/account-status">Moderation decisions and appeals</Link>
        </Button>
        <section aria-labelledby="privacy">
          <h2 id="privacy" className="mb-3 text-[15px] font-bold">
            How your identity is protected
          </h2>
          <ul className="flex flex-col gap-3 text-[14px] leading-relaxed text-muted">
            <li className="flex gap-3">
              <Shuffle className="mt-0.5 size-[18px] shrink-0 text-ink" />
              <span>
                You get a different alias in every thread. What you choose to
                share can still identify you.
              </span>
            </li>
            <li className="flex gap-3">
              <EyeOff className="mt-0.5 size-[18px] shrink-0 text-ink" />
              <span>
                Other students never see your email.{" "}
                {isTeam ? (
                  "Everything you post is labeled Canteen team, so students know it's staff."
                ) : (
                  <>
                    Other universities only see your university once at least{" "}
                    {MIN_MEMBERS_TO_NAME_UNIVERSITY} students from it have
                    joined.
                  </>
                )}
              </span>
            </li>
            {process.env.BLOB_PRIVATE_READ_WRITE_TOKEN && (
              <li className="flex gap-3">
                <ImageOff className="mt-0.5 size-[18px] shrink-0 text-ink" />
                <span>
                  Photos are re-encoded on your device before upload, which
                  strips location and camera data.
                </span>
              </li>
            )}
          </ul>
        </section>

        <Link href="/community" className="text-[14px] font-semibold underline">
          Community rules and how your data is used
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-4 text-[15px] font-semibold ring-1 ring-line transition-colors hover:bg-surface-2"
        >
          <Settings2 aria-hidden className="size-5" />
          Settings & appearance
        </Link>

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
            className="my-3 flex gap-4 text-[13px]"
          >
            {(["mine", "saved", "following"] as const).map((item) => (
              <Link
                key={item}
                href={`/me?collection=${item}`}
                aria-current={collection === item ? "page" : undefined}
                className={collection === item ? "font-bold" : "text-muted"}
              >
                {item === "mine"
                  ? "Posts"
                  : item === "saved"
                    ? "Saved"
                    : "Following"}
              </Link>
            ))}
          </nav>
          <div className="-mx-4 lg:-mx-6">
            <Feed
              key={collection}
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
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-2 border-t border-line pt-6">
          <SignOutButton />
          <span className="flex-1" />
          <DeleteAccountButton />
        </section>
      </div>
    </>
  );
}
