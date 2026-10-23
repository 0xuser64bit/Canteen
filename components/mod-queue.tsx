"use client";

import {
  ArrowUpRight,
  Ban,
  Check,
  EyeOff,
  LifeBuoy,
  Trash2,
} from "lucide-react";
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
  const [reason, setReason] = useState(item.reasons[0]?.reason ?? "OTHER");
  const [pending, startTransition] = useTransition();
  const what = item.target === "post" ? "post" : "reply";

  const decide = (decision: Decision) =>
    startTransition(async () => {
      const result = await moderate({
        target: item.target,
        id: item.id,
        decision,
        reason,
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
        {item.urgent && (
          <span className="flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-white">
            <LifeBuoy className="size-3.5" /> Someone may be at risk
          </span>
        )}
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
      <div className="mb-1.5 flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 text-[13px] text-muted">
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
          <p className="mt-1 text-[15px] leading-relaxed break-words whitespace-pre-line text-ink/85">
            {item.body}
          </p>
        )}
        {item.image && (
          <PostImage
            image={item.image}
            alt={item.image.alt}
            className="max-h-80"
          />
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
              ? `The ${what} is removed. Its author is signed out, and everything else they have posted is hidden. They can sign in only to appeal or delete their account.`
              : "It is hidden from others. Its author can see the reason and appeal. Nobody learns who reported it."
          }
        >
          <label
            className="mb-2 block text-[13px] font-semibold"
            htmlFor={`reason-${item.id}`}
          >
            Reason shown to the author
          </label>
          <select
            id={`reason-${item.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
            className="mb-5 w-full rounded-xl bg-surface px-3 py-2 ring-1 ring-line"
          >
            {REPORT_REASONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
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
        title="No reports waiting"
        body="Reported posts and replies show up here. Appeals are reviewed separately above."
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
