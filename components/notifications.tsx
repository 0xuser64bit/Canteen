"use client";

import { Heart, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TimeAgo } from "@/components/time";
import { cn } from "@/lib/utils";
import { markNotificationsRead } from "@/server/actions";
import type { NotificationItem } from "@/server/queries";

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const hasUnread = items.some((item) => item.unread);
  useEffect(() => {
    if (!hasUnread) return;
    markNotificationsRead(
      items
        .filter((item) => item.unread)
        .map(({ id, revision }) => ({ id, revision })),
    )
      .then(() => router.refresh())
      .catch(() => {});
  }, [hasUnread, items, router]);

  return (
    <ul className="flex flex-col px-2 py-3 lg:px-3">
      {items.map((item) => {
        const comment = item.type === "COMMENT";
        return (
          <li key={item.id}>
            <Link
              href={
                item.replyId
                  ? `/p/${item.post.id}?reply=${item.replyId}#reply-${item.replyId}`
                  : `/p/${item.post.id}`
              }
              className="flex items-start gap-3.5 rounded-3xl px-3 py-3.5 transition-colors hover:bg-surface-3"
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full",
                  comment
                    ? "bg-surface ring-1 ring-line"
                    : "bg-danger-surface text-danger",
                )}
              >
                {comment ? (
                  <MessageCircle className="size-5" />
                ) : (
                  <Heart className="size-5 fill-current" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] text-muted">
                  {comment
                    ? "New replies in a thread"
                    : "Students liked your post"}
                </span>
                <span
                  className={cn(
                    "mt-0.5 line-clamp-2 text-[15px] leading-snug",
                    item.unread ? "font-bold" : "font-medium",
                  )}
                >
                  {item.post.title}
                </span>
                <TimeAgo
                  date={item.createdAt}
                  className="mt-1 block text-[12px] text-muted"
                />
              </span>
              {item.unread && (
                <span
                  className="mt-2 size-2.5 shrink-0 rounded-full bg-danger"
                  aria-label="Unread"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
