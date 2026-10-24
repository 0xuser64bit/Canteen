import {
  BadgeCheck,
  EyeOff,
  ImageOff,
  ShieldCheck,
  Settings2,
  Shuffle,
} from "lucide-react";
import Link from "next/link";
import { DeleteAccountButton, SignOutButton } from "@/components/account";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/session";
import { TEAM } from "@/lib/universities";
import { compactNumber } from "@/lib/utils";
import {
  getAccountStats,
  getModQueueSize,
  isModerator,
  MIN_MEMBERS_TO_NAME_UNIVERSITY,
} from "@/server/queries";

const joined = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

export default async function MeLayout({ children }: LayoutProps<"/me">) {
  const viewer = await requireViewer();
  const isTeam = viewer.university.slug === TEAM.slug;
  const [stats, modQueue] = await Promise.all([
    getAccountStats(viewer),
    isModerator(viewer) ? getModQueueSize() : undefined,
  ]);

  return (
    <>
      <PageHeader
        title="You"
        subtitle="Only you can see this page"
        actions={
          <Button asChild variant="ghost" size="icon" className="size-11">
            <Link href="/settings" aria-label="Settings and appearance">
              <Settings2 aria-hidden />
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-6 px-4 py-5 lg:px-6">
        <section className="rounded-[28px] bg-surface p-4 shadow-soft ring-1 ring-line sm:p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            <BadgeCheck className="size-[18px] text-ink" />{" "}
            {isTeam ? "Team account" : "University email verified"}
          </p>
          <Link
            href={`/u/${viewer.university.slug}`}
            className="mt-2 block text-[22px] leading-tight font-display hover:underline sm:text-[26px]"
          >
            {viewer.university.name}
          </Link>
          <p className="mt-2 text-[13px] text-muted">
            Signed in as{" "}
            <span className="font-medium break-all text-ink">
              {viewer.email}
            </span>{" "}
            · joined {joined.format(viewer.createdAt)}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-4">
            {[
              ["Posts", stats.posts],
              ["Replies", stats.comments],
              ["Likes received", stats.likesReceived],
              ["Helpful replies", stats.helpful],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12px] font-semibold text-muted">
                  {label}
                </dt>
                <dd className="mt-0.5 text-[20px] font-bold tabular">
                  {compactNumber(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex justify-end">
            <SignOutButton />
          </div>
        </section>

        {children}

        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-4 text-[15px] font-semibold ring-1 ring-line transition-colors hover:bg-surface-2"
        >
          <Settings2 aria-hidden className="size-5" />
          Settings & appearance
        </Link>
        {modQueue !== undefined && (
          <Button asChild>
            <Link href="/mod">
              <ShieldCheck /> Moderation queue
              {modQueue > 0 && ` · ${modQueue} waiting`}
            </Link>
          </Button>
        )}
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
        <Link href="/updates" className="text-[14px] font-semibold underline">
          What&apos;s new at Canteen
        </Link>
        <section className="flex justify-end border-t border-line pt-6">
          <DeleteAccountButton />
        </section>
      </div>
    </>
  );
}
