import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { SignIn } from "@/components/sign-in";
import { isEmailEnabled, isGoogleEnabled } from "@/lib/auth";
import { getAccountViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Join" };

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const account = await getAccountViewer();
  if (account) redirect(account.bannedAt ? "/account-status" : "/campus");
  const { error } = await searchParams;

  return (
    <main className="wallpaper flex min-h-dvh flex-col items-center px-4 py-8 sm:justify-center">
      <Link
        href="/"
        aria-label="Canteen"
        className="mb-8 sm:absolute sm:top-6 sm:left-8"
      >
        <Logo />
      </Link>
      <div className="w-full max-w-[420px] rounded-[32px] bg-surface p-6 shadow-pop ring-1 ring-line sm:p-8">
        <h1 className="text-[30px] leading-[1.05] font-display">
          Pull up a chair.
        </h1>
        <p className="mt-3 mb-6 text-[15px] leading-relaxed text-muted">
          Canteen is for verified university students. We check your university
          once, then never show who you are.
        </p>
        <SignIn
          emailEnabled={isEmailEnabled}
          googleEnabled={isGoogleEnabled}
          initialError={typeof error === "string" ? error : undefined}
        />
      </div>
      <p className="mt-6 max-w-[420px] text-center text-[12px] leading-relaxed text-muted">
        By joining you agree to keep it kind: no harassment, no hate, and no
        sharing anyone&apos;s personal details.
      </p>
    </main>
  );
}
