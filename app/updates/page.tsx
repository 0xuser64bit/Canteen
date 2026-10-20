import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { repoUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "What's new",
  description:
    "The latest improvements to conversations, privacy and everyday use on Canteen.",
};

export default function UpdatesPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[15px] leading-relaxed">
      <header>
        <Link
          href="/"
          aria-label="Canteen home"
          className="inline-flex min-h-11 items-center rounded-xl"
        >
          <Logo />
        </Link>
        <h1 className="mt-8 text-[32px] leading-tight font-display">
          What&apos;s new.
        </h1>
        <p className="mt-3 max-w-prose text-muted">
          The changes making Canteen a little easier to use, one conversation at
          a time.
        </p>
      </header>

      <article
        aria-labelledby="october-update"
        className="mt-8 border-t border-line pt-7"
      >
        <header>
          <h2
            id="october-update"
            className="text-[24px] leading-tight font-semibold tracking-tight"
          >
            A steadier place to talk.
          </h2>
          <time
            dateTime="2026-10-20"
            className="mt-2 block text-[13px] text-muted"
          >
            20 October 2026
          </time>
        </header>

        <div className="mt-7 space-y-6">
          <section>
            <h3 className="text-[20px] font-semibold">
              Sign-in that helps you recover
            </h3>
            <p className="mt-2 text-muted">
              A dropped connection now leaves your email or code in place with a
              way to try again. Sending and verifying codes stay tied to the
              address you chose, even when things take a moment.
            </p>
          </section>
          <section>
            <h3 className="text-[20px] font-semibold">
              Keep your place in the conversation
            </h3>
            <p className="mt-2 text-muted">
              Relevant reading filters stay with you when you change topics.
              Back from a thread returns to the feed or private collection you
              came from. If more posts fail to load, the posts already on screen
              stay put while you retry.
            </p>
          </section>
          <section>
            <h3 className="text-[20px] font-semibold">
              Your collections, closer at hand
            </h3>
            <p className="mt-2 text-muted">
              Your posts, saved posts and followed threads now sit just below
              your account summary. Settings and sign-out stay easy to reach.
              Those collections are still private to you.
            </p>
          </section>
          <section>
            <h3 className="text-[20px] font-semibold">
              More room for thumbs and words
            </h3>
            <p className="mt-2 text-muted">
              Form text is easier to read on phones, reply controls have more
              room to tap, and long sign-in addresses wrap on your account page.
              Empty feeds explain the filters you chose and let you clear them.
            </p>
          </section>
          <section>
            <h3 className="text-[20px] font-semibold">
              More care behind the scenes
            </h3>
            <p className="mt-2 text-muted">
              Urgent safety reports are easier for moderators to find, and poll
              votes recheck account access before they are accepted. Retrying a
              reply after a lost acknowledgement also reuses the same submission
              to help prevent duplicates.
            </p>
          </section>
        </div>
      </article>

      <footer className="mt-9 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-[13px] font-semibold">
        <a
          href={`${repoUrl}/commits/main/`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center underline"
        >
          Follow the changes on GitHub
        </a>
        <Link
          href="/community"
          className="inline-flex min-h-11 items-center underline"
        >
          Community and privacy
        </Link>
      </footer>
    </main>
  );
}
