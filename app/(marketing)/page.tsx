import { ArrowRight, BadgeCheck, GitFork, Globe, Lock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AliasAvatar, AliasName } from "@/components/alias";
import { ChatDemo } from "@/components/chat-demo";
import { Logo, LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { isEmailEnabled } from "@/lib/auth";
import { getViewer } from "@/lib/session";
import { repoUrl } from "@/lib/site";

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[0.2em] bg-you box-decoration-clone px-[0.08em] text-you-ink">
      {children}
    </span>
  );
}

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  if (await getViewer()) redirect("/home");
  const { deleted } = await searchParams;
  const joinLabel = isEmailEnabled
    ? "Join with your university email"
    : "Join with your university account";

  return (
    <div className="overflow-x-clip">
      {deleted && (
        <p
          role="status"
          className="bg-ink px-4 py-2.5 text-center text-[13px] font-medium text-background"
        >
          Your account and everything you posted have been deleted.
        </p>
      )}

      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <Button asChild variant="secondary">
          <Link href="/join">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-14 lg:pb-28">
        <div>
          <h1 className="text-[clamp(3rem,8vw,6.25rem)] leading-[0.92] font-display text-balance">
            <Highlight>Talk</Highlight> like nobody&apos;s watching.
          </h1>
          <p className="mt-7 max-w-[34rem] text-[18px] leading-relaxed text-pretty text-muted sm:text-[20px]">
            Canteen is the group chat for verified university students. Your
            university account proves you&apos;re a student. Your posts never
            show who you are.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button
              asChild
              variant="primary"
              size="lg"
              className="h-14 px-7 text-[16px]"
            >
              <Link href="/join">
                {joinLabel} <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-14">
              <a href="#how">How it works</a>
            </Button>
          </div>
          <p className="mt-6 text-[14px] text-muted">
            No passwords. No real names. No profile photos.
          </p>
        </div>
        <ChatDemo className="mx-auto lg:mr-0" />
      </section>

      <section
        id="how"
        className="border-t border-line bg-surface-2 py-20 lg:py-28"
      >
        <div className="mx-auto flex max-w-[1100px] flex-col gap-20 px-5 sm:px-8 lg:gap-28">
          <h2 className="max-w-[44rem] text-[clamp(2rem,4.5vw,3.5rem)] leading-[1] font-display text-balance">
            Verified, not identified.
          </h2>

          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-[26px] font-bold tracking-tight">
                Prove you&apos;re a student, once.
              </h3>
              <p className="mt-3 max-w-[32rem] text-[17px] leading-relaxed text-muted">
                Sign in with a code sent to your university email, or with your
                university&apos;s Google account. That tells us which university
                you&apos;re at. It never becomes your name.
              </p>
            </div>
            <div className="rounded-[28px] bg-surface p-6 shadow-soft ring-1 ring-line">
              <p className="text-[13px] font-semibold text-muted">
                University email
              </p>
              <p className="mt-2 rounded-2xl bg-surface-2 px-4 py-3.5 text-[16px] ring-1 ring-line">
                you@maplewood.edu
              </p>
              <p className="mt-3 flex items-center gap-2 text-[14px] font-semibold">
                <BadgeCheck className="size-[18px]" /> Maplewood University
              </p>
              <p className="mt-1 text-[12px] text-muted">Example</p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="lg:order-2">
              <h3 className="text-[26px] font-bold tracking-tight">
                A new name in every thread.
              </h3>
              <p className="mt-3 max-w-[32rem] text-[17px] leading-relaxed text-muted">
                Each conversation gives you a fresh alias, so what you say in
                one thread can&apos;t be traced to another. Inside a thread your
                alias stays put, so conversations still make sense.
              </p>
            </div>
            <div className="flex flex-col gap-4 rounded-[28px] bg-surface p-6 shadow-soft ring-1 ring-line">
              {[
                {
                  thread: "Is the night bus safe after 1am?",
                  alias: { name: "Quiet Otter", hue: 155 },
                },
                {
                  thread: "How do I tell my parents I'm switching majors?",
                  alias: { name: "Daring Koala", hue: 300 },
                },
              ].map((row) => (
                <div key={row.thread} className="flex items-center gap-3">
                  <AliasAvatar alias={row.alias} />
                  <div className="min-w-0">
                    <AliasName alias={row.alias} className="text-[14px]" />
                    <p className="truncate text-[14px] text-muted">
                      in &ldquo;{row.thread}&rdquo;
                    </p>
                  </div>
                </div>
              ))}
              <p className="border-t border-line pt-4 text-[13px] text-muted">
                Same student. Two threads. No link between them.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-[26px] font-bold tracking-tight">
                Choose who hears it.
              </h3>
              <p className="mt-3 max-w-[32rem] text-[17px] leading-relaxed text-muted">
                Post to every university, or keep it between classmates.
                Campus-only posts are invisible to everyone outside your
                university.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 rounded-[28px] bg-surface p-6 shadow-soft ring-1 ring-line">
              <span className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold text-muted ring-1 ring-line">
                <Globe className="size-4" /> Every university
              </span>
              <span className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-background">
                <Lock className="size-4" /> Only Maplewood University
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#16181d] py-20 text-white lg:py-28 dark:bg-surface dark:text-ink dark:ring-1 dark:ring-line">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
          <p className="max-w-[52rem] text-[clamp(2rem,5vw,4rem)] leading-[1] font-display text-balance">
            No real names. No follower counts. No profile photos. Just students,
            talking.
          </p>
          <ul className="mt-12 grid gap-8 text-[16px] leading-relaxed text-white/75 sm:grid-cols-3 dark:text-muted">
            <li>
              Reported posts hide automatically after several students flag
              them. Reporters stay anonymous too.
            </li>
            <li>
              Photos are re-encoded on your phone before upload, which removes
              location data.
            </li>
            <li>
              The whole thing is open source, so anyone can check how it works.{" "}
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline underline-offset-4"
              >
                Read the code
              </a>
              .
            </li>
          </ul>
        </div>
      </section>

      <section className="wallpaper py-24 text-center lg:py-32">
        <div className="mx-auto max-w-[44rem] px-5">
          <LogoMark className="mx-auto size-16" />
          <h2 className="mt-6 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1] font-display text-balance">
            Your table is waiting.
          </h2>
          <Button
            asChild
            variant="primary"
            size="lg"
            className="mt-9 h-14 px-7 text-[16px]"
          >
            <Link href="/join">
              {joinLabel} <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[13px] text-muted sm:px-8">
          <Logo className="opacity-80" />
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 font-semibold hover:text-ink"
          >
            <GitFork className="size-4" /> Open source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
