import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountButton, SignOutButton } from "@/components/account";
import { Appeals } from "@/components/appeals";
import { getAccountViewer } from "@/lib/session";
import { getModerationHistory } from "@/server/queries";

export const metadata: Metadata = { title: "Decisions and appeals" };

export default async function AccountStatusPage() {
  const viewer = await getAccountViewer();
  if (!viewer) redirect("/join");
  const items = await getModerationHistory(viewer);
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-[28px] font-display">
          {viewer.bannedAt
            ? "Your account is suspended"
            : "Decisions and appeals"}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          {viewer.bannedAt
            ? "You can review decisions, appeal, sign out, or delete your account. Student feeds and posting are unavailable during suspension."
            : "Only you and the team can see your appeals. Reporters stay anonymous."}
        </p>
      </header>
      {!viewer.bannedAt && (
        <Link href="/me" className="text-[14px] font-semibold underline">
          Back to your account
        </Link>
      )}
      <Appeals items={items} />
      <footer className="mt-auto flex flex-wrap justify-between gap-3 border-t border-line pt-6">
        <SignOutButton />
        <DeleteAccountButton />
      </footer>
    </main>
  );
}
