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
  const pageCursor =
    typeof before === "string" && before.length <= 128 ? before : undefined;
  const items = await getNotifications(viewer, pageCursor);
  const last = items.at(-1);
  const cursor = last ? `${last.createdAt.toISOString()}_${last.id}` : null;
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Replies, likes, and threads you follow. Never who."
      />
      {items.length === 0 ? (
        <EmptyState
          title={pageCursor ? "No older notifications" : "You're all caught up"}
          action={false}
          body={
            pageCursor ? (
              "You've reached the end of this activity. Head back to the latest notifications."
            ) : (
              <>
                Replies to your posts and followed threads, along with likes on
                your posts, appear here. Notifications never name the person.
                <span className="mt-3 block">
                  <Link
                    href="/campus"
                    className="inline-flex min-h-11 items-center font-semibold text-ink underline"
                  >
                    Find a conversation
                  </Link>
                </span>
              </>
            )
          }
        />
      ) : (
        <NotificationList key={pageCursor ?? "latest"} items={items} />
      )}
      <nav
        aria-label="Notification pages"
        className="flex justify-center gap-4 p-4 text-[13px] font-semibold"
      >
        {cursor && items.length === 50 && (
          <Link
            href={`/notifications?before=${encodeURIComponent(cursor)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-4 ring-1 ring-line transition-colors hover:bg-surface-2"
          >
            Older notifications
          </Link>
        )}
        {pageCursor && (
          <Link
            href="/notifications"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-4 ring-1 ring-line transition-colors hover:bg-surface-2"
          >
            Latest notifications
          </Link>
        )}
      </nav>
    </>
  );
}
