import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty";
import { NotificationList } from "@/components/notifications";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/lib/session";
import { getNotifications } from "@/server/queries";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams,
}: PageProps<"/notifications">) {
  const viewer = await requireViewer();
  const { before } = await searchParams;
  const items = await getNotifications(
    viewer,
    typeof before === "string" && before.length <= 128 ? before : undefined,
  );
  const last = items.at(-1);
  const cursor = last ? `${last.createdAt.toISOString()}_${last.id}` : null;
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Replies and likes on your posts. Never who."
      />
      {items.length === 0 ? (
        <EmptyState
          title="Nothing new"
          body="When students reply to or like your posts, it shows up here. Nobody, including you, sees who it was."
        />
      ) : (
        <NotificationList items={items} />
      )}
      <nav
        aria-label="Notification pages"
        className="flex justify-center gap-4 p-4 text-[13px] font-semibold"
      >
        {cursor && items.length === 50 && (
          <Link
            href={`/notifications?before=${encodeURIComponent(cursor)}`}
            className="underline"
          >
            Older notifications
          </Link>
        )}
        {before && (
          <Link href="/notifications" className="underline">
            Latest notifications
          </Link>
        )}
      </nav>
    </>
  );
}
