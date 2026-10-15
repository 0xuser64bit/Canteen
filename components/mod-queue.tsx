"use client";

import { ArrowUpRight, Ban, Check, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AliasName } from "@/components/alias";
import { EmptyState } from "@/components/empty";
import { PostImage, UniversityLabel } from "@/components/post";
import { TimeAgo } from "@/components/time";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { REPORT_REASONS } from "@/lib/validation";
import { moderate } from "@/server/actions";
import type { ModItem } from "@/server/queries";

type Decision = "keep" | "remove" | "ban";

function reasonsLine(item: ModItem) {
  return item.reasons
    .map(({ reason, count }) => {
      const label = REPORT_REASONS.find((r) => r.id === reason)!.label;
      return count > 1 ? `${label} ×${count}` : label;
    })
    .join(", ");
}

function QueueItem({ item, onDone }: { item: ModItem; onDone: () => void }) {
  const [confirm, setConfirm] = useState<"remove" | "ban" | null>(null);
  const [pending, startTransition] = useTransition();
  const what = item.target === "post" ? "post" : "reply";

  const decide = (decision: Decision) =>
    startTransition(async () => {
      const result = await moderate({
        target: item.target,
        id: item.id,
        decision,
      });
      if (!result.ok) return void toast.error(result.error);
      setConfirm(null);
      onDone();
      toast.success(
        {
          keep: "Kept. Its reports are closed.",
          remove: `The ${what} is gone.`,
          ban: "Removed, and the author is banned.",
        }[decision],
      );
    });

  return (
    <article className="border-b border-line px-4 py-6 lg:px-6">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] font-semibold">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted ring-1 ring-line">
          {item.target === "post" ? "Post" : "Reply"}
        </span>
        {item.hidden && (
          <span className="flex items-center gap-1 rounded-full bg-danger-surface px-2.5 py-1 text-danger">
            <EyeOff className="size-3.5" /> Hidden from feeds
          </span>
        )}
        <span className="text-muted">
          {item.reportCount} {item.reportCount === 1 ? "report" : "reports"}:{" "}
          {reasonsLine(item)}
        </span>
      </div>

      {item.target === "comment" && (
        <p className="mb-2 truncate px-1 text-[13px] text-muted">
          Reply in <span className="font-semibold text-ink">{item.title}</span>
        </p>
      )}
      <div className="mb-1.5 flex max-w-full items-center gap-1.5 px-1 text-[13px] text-muted">
        <AliasName alias={item.alias} className="shrink-0" />
        <span aria-hidden>·</span>
        <UniversityLabel university={item.university} />
        <span aria-hidden>·</span>
        <TimeAgo date={item.createdAt} className="shrink-0" />
      </div>
      <div className="rounded-[24px] rounded-tl-md bg-surface px-4 py-3.5 shadow-soft ring-1 ring-line">
        {item.target === "post" && (
          <h2 className="text-[17px] leading-snug font-semibold tracking-tight text-pretty">
            {item.title}
          </h2>
        )}
        {item.body && (
          <p className="mt-1 line-clamp-12 text-[15px] leading-relaxed break-words whitespace-pre-line text-ink/85">
            {item.body}
          </p>
        )}
        {item.image && (
          <PostImage image={item.image} alt="" className="max-h-80" />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={pending} onClick={() => decide("keep")}>
          <Check /> Keep
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => setConfirm("remove")}
          className="text-danger"
        >
          <Trash2 /> Remove
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => setConfirm("ban")}
        >
          <Ban /> Ban author
        </Button>
        <span className="flex-1" />
        {item.threadId && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/p/${item.threadId}`}>
              Open thread <ArrowUpRight />
            </Link>
          </Button>
        )}
      </div>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <DialogContent
          title={
            confirm === "ban"
              ? "Remove it and ban the author?"
              : `Remove this ${what}?`
          }
          description={
            confirm === "ban"
              ? `The ${what} is deleted. Its author is signed out, can't sign back in, and everything else they've posted is hidden.`
              : "It's deleted for everyone. Nobody learns who reported it."
          }
        >
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => confirm && decide(confirm)}
            >
              {pending
                ? "Working…"
                : confirm === "ban"
                  ? "Ban author"
                  : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function ModQueue({ items }: { items: ModItem[] }) {
  const [done, setDone] = useState<string[]>([]);
  const left = items.filter(
    (item) => !done.includes(`${item.target}:${item.id}`),
  );

  if (left.length === 0)
    return (
      <EmptyState
        title="All clear"
        body="Nothing is waiting for review. When students report a post or a reply, it shows up here."
        action={false}
      />
    );

  return (
    <div>
      {left.map((item) => {
        const key = `${item.target}:${item.id}`;
        return (
          <QueueItem
            key={key}
            item={item}
            onDone={() => setDone((keys) => [...keys, key])}
          />
        );
      })}
    </div>
  );
}
