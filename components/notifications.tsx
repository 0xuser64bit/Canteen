"use client";

import { Check, ChevronRight, Heart, MessageCircle, Reply } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TimeAgo } from "@/components/time";
import { ThreadLink } from "@/components/thread-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markNotificationsRead } from "@/server/actions";
import type { NotificationItem } from "@/server/queries";

type Delivered = Pick<NotificationItem, "id" | "revision">;
const version = ({ id, revision }: Delivered) => `${id}:${revision}`;

/** What happened, in words that never say who did it. */
function describe({ type, post }: NotificationItem) {
  if (type === "LIKE")
    return {
      icon: FilledHeart,
      tone: "bg-danger-surface text-danger",
      label: "New likes on your post",
    };
  if (type === "HELPFUL")
    return {
      icon: Check,
      tone: "bg-ink text-background",
      label: "The author marked your reply helpful",
    };
  if (type === "REPLY")
    return {
      icon: Reply,
      tone: "bg-surface ring-1 ring-line",
      label: "Someone answered your reply",
    };
  return {
    icon: MessageCircle,
    tone: "bg-surface ring-1 ring-line",
    label: post.mine
      ? `New replies to your ${post.question ? "question" : "post"}`
      : "New replies in a thread you follow",
  };
}

function FilledHeart({ className }: { className?: string }) {
  return <Heart aria-hidden className={cn("fill-current", className)} />;
}

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [arrival, setArrival] = useState(() => ({
    items,
    versions: new Map(
      items
        .filter((item) => item.unread)
        .map((item) => [item.id, item.revision]),
    ),
  }));
  let arrivalVersions = arrival.versions;
  if (arrival.items !== items) {
    arrivalVersions = new Map(
      items
        .filter(
          (item) =>
            item.unread || arrival.versions.get(item.id) === item.revision,
        )
        .map((item) => [item.id, item.revision]),
    );
    setArrival({ items, versions: arrivalVersions });
  }

  const delivered = useMemo(
    () =>
      items
        .filter((item) => item.unread)
        .map(({ id, revision }) => ({ id, revision })),
    [items],
  );
  const attempted = useRef(new Set<string>());
  const mounted = useRef(false);
  const retrying = useRef(false);
  const [failed, setFailed] = useState<Delivered[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const acknowledge = useCallback(
    async (versions: Delivered[]) => {
      try {
        await markNotificationsRead(versions);
        if (!mounted.current) return;
        const acknowledged = new Set(versions.map(version));
        setFailed((previous) =>
          previous.filter((item) => !acknowledged.has(version(item))),
        );
        router.refresh();
      } catch {
        if (!mounted.current) return;
        setFailed((previous) => [
          ...new Map(
            [...previous, ...versions].map((item) => [version(item), item]),
          ).values(),
        ]);
      }
    },
    [router],
  );

  useEffect(() => {
    const next = delivered.filter(
      (item) => !attempted.current.has(version(item)),
    );
    if (next.length === 0) return;
    next.forEach((item) => attempted.current.add(version(item)));
    void acknowledge(next);
  }, [acknowledge, delivered]);

  const unreadVersions = new Set(delivered.map(version));
  const retryable = failed.filter((item) => unreadVersions.has(version(item)));

  return (
    <div className="space-y-6 px-4 py-5 lg:px-6">
      {retryable.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-2">
          <p role="status" className="max-w-sm text-[13px] text-muted">
            Couldn&apos;t update read status. Your notifications are still here.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={pending}
            onClick={async () => {
              if (retrying.current) return;
              retrying.current = true;
              setPending(true);
              await acknowledge(retryable);
              retrying.current = false;
              if (mounted.current) setPending(false);
            }}
          >
            {pending ? "Retrying…" : "Retry"}
          </Button>
        </div>
      )}
      {([true, false] as const).map((newOnArrival) => {
        const group = items.filter(
          (item) =>
            (arrivalVersions.get(item.id) === item.revision) === newOnArrival,
        );
        if (group.length === 0) return null;
        return (
          <section
            key={String(newOnArrival)}
            aria-label={
              newOnArrival ? "New notifications" : "Earlier notifications"
            }
          >
            <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">
              {newOnArrival ? "New" : "Earlier"}
            </h2>
            <ul className="flex flex-col gap-1">
              {group.map((item) => {
                const { icon: Icon, tone, label } = describe(item);
                return (
                  <li key={item.id}>
                    <ThreadLink
                      href={
                        item.replyId
                          ? `/p/${item.post.id}?reply=${item.replyId}#reply-${item.replyId}`
                          : `/p/${item.post.id}`
                      }
                      className={cn(
                        "flex min-h-11 items-start gap-3 rounded-2xl px-3 py-3.5 transition-colors hover:bg-surface-3",
                        newOnArrival && "bg-surface-2",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-full",
                          tone,
                        )}
                      >
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "line-clamp-2 block text-[15px] leading-snug",
                            newOnArrival ? "font-semibold" : "font-medium",
                          )}
                        >
                          {item.post.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
                          <span>{label}</span>
                          <span aria-hidden>·</span>
                          <TimeAgo date={item.createdAt} />
                        </span>
                      </span>
                      {newOnArrival ? (
                        <span
                          className="mt-2 size-2 shrink-0 rounded-full bg-ink"
                          aria-label="New on arrival"
                        />
                      ) : (
                        <ChevronRight
                          aria-hidden
                          className="mt-1 size-4 shrink-0 text-muted"
                        />
                      )}
                    </ThreadLink>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
