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
        aria-labelledby="conversation-update"
        className="mt-8 border-t border-line pt-7"
      >
        <header>
          <h2
            id="conversation-update"
            className="text-[24px] leading-tight font-semibold tracking-tight"
          >
            Conversations that come back to you.
          </h2>
          <time
            dateTime="2026-10-24"
            className="mt-2 block text-[13px] text-muted"
          >
            24 October 2026
          </time>
        </header>
        <div className="mt-7 space-y-6">
          <section>
            <h3 className="text-[20px] font-semibold">
              Answer a specific message
            </h3>
            <p className="mt-2 text-muted">
              Choose Reply to this from any message&apos;s menu. Your reply
              carries a short quote that jumps back to the original, and the
              student you answered gets a direct alert. Quotes never show a
              hidden message to anyone but its author.
            </p>
          </section>
          <section>
            <h3 className="text-[20px] font-semibold">Hear about follow-ups</h3>
            <p className="mt-2 text-muted">
              Replying to a thread now follows it, so you hear when the person
              who asked comes back with a question. When an author marks your
              reply helpful, you get a thank-you alert, and your account page
              counts your helpful replies privately. Alerts say what happened,
              still never who. A New replies pill points to messages that arrive
              while you&apos;re reading further up.
            </p>
          </section>
          <section>
            <h3 className="text-[20px] font-semibold">Better on your phone</h3>
            <p className="mt-2 text-muted">
              Opportunity cards count down to their deadline. Opportunities sits
              right after All in every topic row, trending threads open the
              Everyone feed on smaller screens, and a new post starts with the
              writing instead of the settings. Message times are shorter, long
              university names no longer wrap the line, and the installed app
              offers shortcuts from its home-screen icon.
            </p>
          </section>
        </div>
      </article>

      <article
        aria-labelledby="reliability-update"
        className="mt-8 border-t border-line pt-7"
      >
        <header>
          <h2
            id="reliability-update"
            className="text-[24px] leading-tight font-semibold tracking-tight"
          >
            Keep your words. Keep your progress.
          </h2>
          <time
            dateTime="2026-10-23"
            className="mt-2 block text-[13px] text-muted"
          >
            23 October 2026
          </time>
        </header>
        <div className="mt-7 space-y-6">
          <section>
            <h3 className="text-[20px] font-semibold">
              A clearer way to retry
            </h3>
            <p className="mt-2 text-muted">
              If publishing loses its connection, your draft stays in place.
              When an earlier reply needs confirmation, retry it separately
              while keeping your newer draft. Appeals and university domain
              requests also keep your text through a failed request.
            </p>
          </section>
          <section>
            <h3 className="text-[20px] font-semibold">Actions that stay put</h3>
            <p className="mt-2 text-muted">
              Likes, poll results, saves and reply follows now keep their
              confirmed state on posts loaded further down a feed. Busy campuses
              can show eligible universities even when smaller campuses are
              posting more, while small campuses stay unnamed.
            </p>
          </section>
          <section>
            <h3 className="text-[20px] font-semibold">More room, more care</h3>
            <p className="mt-2 text-muted">
              Writing, search, menus and conversation controls have more room to
              tap. Moderators can read complete reported messages before making
              a decision, and failed decisions offer a retry. Campus access
              checks also apply when a host assignment ends, including threads
              the host started.
            </p>
          </section>
        </div>
      </article>

      <article
        aria-labelledby="appearance-update"
        className="mt-8 border-t border-line pt-7"
      >
        <header>
          <h2
            id="appearance-update"
            className="text-[24px] leading-tight font-semibold tracking-tight"
          >
            Quieter nights, clearer conversations.
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
              A softer accent after dark
            </h3>
            <p className="mt-2 text-muted">
              Soft mode now gives your messages a dark tint with light text,
              keeping long conversations easier on the eyes. Vivid keeps the
              full color. Choose either above the live preview in Settings;
              palette samples follow your choice too.
            </p>
          </section>
          <section>
            <h3 className="text-[20px] font-semibold">
              Less clutter, easier taps
            </h3>
            <p className="mt-2 text-muted">
              Feed filters have more room to tap, and a lone Latest control no
              longer takes up a row. Campus invitations leave more room for
              conversations. Saved filters make the current view clearer and
              help you return to the full collection when it is empty.
            </p>
          </section>
          <section>
            <h3 className="text-[20px] font-semibold">
              Activity you can read at your pace
            </h3>
            <p className="mt-2 text-muted">
              Notifications separate New from Earlier and keep that distinction
              while you read. Failed read-status updates offer Retry. Reporting,
              deleting, saving and following also explain connection failures;
              report choices stay in place so you can try again.
            </p>
          </section>
        </div>
      </article>

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
