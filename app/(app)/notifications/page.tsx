import type { Metadata } from "next";
import { EmptyState } from "@/components/empty";
import { NotificationList } from "@/components/notifications";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/lib/session";
import { getNotifications } from "@/server/queries";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const items = await getNotifications(viewer);
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
    </>
  );
}
