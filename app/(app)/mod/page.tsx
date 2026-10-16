import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Appeals } from "@/components/appeals";
import { ModQueue } from "@/components/mod-queue";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/lib/session";
import { getAppeals, getModQueue, isModerator } from "@/server/queries";

export const metadata: Metadata = { title: "Moderation" };

export default async function ModerationPage() {
  const viewer = await requireViewer();
  if (!isModerator(viewer)) notFound();
  const [items, appeals] = await Promise.all([
    getModQueue(viewer),
    getAppeals(viewer),
  ]);

  return (
    <>
      <PageHeader
        title="Moderation"
        subtitle="You see what was said, never who said it."
      />
      <div className="px-4 pt-4 lg:px-6">
        <Link href="/launch" className="text-[13px] font-semibold underline">
          Campus launch measures
        </Link>
      </div>
      <section className="px-4 py-6 lg:px-6">
        <h2 className="mb-4 text-[18px] font-semibold">Appeals</h2>
        <Appeals items={appeals} review />
      </section>
      <ModQueue items={items} />
    </>
  );
}
