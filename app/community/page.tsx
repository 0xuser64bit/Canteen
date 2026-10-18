import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Community and privacy" };

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-7 px-5 py-10 text-[15px] leading-relaxed">
      <header>
        <Link href="/campus" className="text-[13px] font-semibold underline">
          Canteen
        </Link>
        <h1 className="mt-4 text-[32px] leading-tight font-display">
          A useful place to ask honestly.
        </h1>
        <p className="mt-3 text-muted">
          Keep it kind, keep it useful, and protect each other’s privacy.
        </p>
      </header>
      <section>
        <h2 className="text-[20px] font-semibold">What verification means</h2>
        <p className="mt-2 text-muted">
          Sign-in checks control of an email address at a recognized university.
          It does not independently prove current enrollment. Team accounts are
          labeled “Canteen team” wherever they post.
        </p>
      </section>
      <section>
        <h2 className="text-[20px] font-semibold">What other people see</h2>
        <p className="mt-2 text-muted">
          Students see a different alias for you in every thread. Your email,
          account identifier, saved posts and followed threads are not shared
          with other students. Small campuses are unnamed outside their own
          campus until five members join. Campus-only posts and photos are
          visible to your university and to explicitly assigned Canteen campus
          hosts. Host contributions are labeled; other universities cannot load
          these posts. Moderators can review reported content.
        </p>
      </section>
      <section>
        <h2 className="text-[20px] font-semibold">What Canteen stores</h2>
        <p className="mt-2 text-muted">
          Canteen stores your sign-in email, university, sessions, content and
          account-linked activity needed for likes, views, reports, saves and
          follows. The service can connect these records internally; per-thread
          aliases do not make the database anonymous. Moderation screens show
          content and appeals without author or reporter identities. Authorized
          service operators have database access. Sign-in provider tokens, real
          names and profile photos are not retained by Canteen.
        </p>
        <p className="mt-2 text-muted">
          One activity mark per account and UTC day supports aggregate campus
          measures. It contains no page history or text and expires after 90
          days. These measures stay within Canteen; no external analytics
          service receives them. Publication limiter records contain account,
          kind and time, expire after 24 hours, and are erased with the account.
          Email sign-in attempt counters hold a one-way hash of the address or a
          campus domain, never the address or code, and are removed once their
          hour has passed. Domain correction requests contain only a domain and
          official homepage and expire after 90 days. Scheduled maintenance
          enforces these time limits.
        </p>
      </section>
      <section>
        <h2 className="text-[20px] font-semibold">
          Protect yourself and others
        </h2>
        <p className="mt-2 text-muted">
          Browser drafts belong to your current sign-in session and clear on
          successful sign-out or account deletion. Draft text remains on this
          device until then; someone with device access may be able to read it.
          Image bytes are not saved in drafts. Do not post names, contact
          details, identifying photos, harassment, hate or scams. Text checks
          catch some contact details; they cannot identify every personal
          detail. Photos lose location and camera metadata, but faces,
          screenshots and the scene itself can identify someone. Check what is
          visible before sharing.
        </p>
      </section>
      <section>
        <h2 className="text-[20px] font-semibold">
          Reports, decisions and appeals
        </h2>
        <p className="mt-2 text-muted">
          Three distinct reports hide content pending review. The team can keep
          it, remove it or suspend its author. You can see the reason and submit
          one private appeal per team decision from your account. Suspended
          students can sign in to appeal or delete their account. Reports do not
          reveal the reporter.
        </p>
        <p className="mt-2 text-muted">
          Team removal retains content for review and appeal. Deleting your own
          post erases its text and replies; account deletion erases your account
          and related records. Stored images are queued for erasure and retried
          if storage is unavailable. Old public image links remain accessible
          until their migration and erasure finish. Hosting, database backups
          and sign-in providers may retain their own operational records.
        </p>
      </section>
      <section>
        <h2 className="text-[20px] font-semibold">
          Opportunities and urgent support
        </h2>
        <p className="mt-2 text-muted">
          Opportunities are student submissions. Confirm terms with the
          organizer and avoid sharing sensitive information through unfamiliar
          application sites. Canteen is a peer discussion space, with no
          guaranteed response time. For immediate danger, contact local
          emergency services.
        </p>
      </section>
      <Link
        href="/campus"
        className="inline-flex rounded-full bg-you px-5 py-2.5 font-semibold text-you-ink"
      >
        Back to campus
      </Link>
    </main>
  );
}
