"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TimeAgo } from "@/components/time";
import { REPORT_REASONS } from "@/lib/validation";
import { submitAppeal, reviewAppeal } from "@/server/actions";
import type { ModerationHistory } from "@/server/queries";

function Decision({
  item,
  review,
}: {
  item: ModerationHistory[number];
  review: boolean;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const act = (restore?: boolean) =>
    startTransition(async () => {
      const result = review
        ? await reviewAppeal(item.id, restore!, body)
        : await submitAppeal(item.id, body);
      if (!result.ok) return void toast.error(result.error);
      setBody("");
      toast.success(review ? "Appeal reviewed" : "Appeal sent to the team");
    });
  const canAppeal = item.decision !== "KEEP" && !item.appealedAt;
  return (
    <article className="rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-line">
      <p className="text-[13px] font-semibold">
        {item.decision === "KEEP"
          ? "Kept after review"
          : item.decision === "BAN"
            ? "Account suspended"
            : "Content removed"}{" "}
        · <TimeAgo date={item.createdAt} />
      </p>
      <h2 className="mt-2 text-[17px] font-semibold">{item.title}</h2>
      <p className="mt-2 max-h-56 overflow-y-auto text-[14px] leading-relaxed break-words whitespace-pre-wrap">
        {item.body}
      </p>
      <p className="mt-3 text-[13px] text-muted">
        Reason: {REPORT_REASONS.find((r) => r.id === item.reason)?.label}
      </p>
      {item.appealText && (
        <p className="mt-3 text-[14px] break-words whitespace-pre-wrap">
          <strong>Appeal:</strong> {item.appealText}
        </p>
      )}
      {item.resolvedAt ? (
        <div className="mt-3 text-[14px]">
          <p className="font-semibold">
            {item.restored ? "Appeal accepted · restored" : "Decision upheld"}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{item.response}</p>
        </div>
      ) : item.appealedAt && !review ? (
        <p className="mt-3 text-[13px] font-semibold">Awaiting team review</p>
      ) : null}
      {(review || canAppeal) && !item.resolvedAt && (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            act();
          }}
        >
          <label
            htmlFor={`appeal-${item.id}`}
            className="block text-[13px] font-semibold"
          >
            {review
              ? "Explain the outcome to the author"
              : "Why should the team reconsider?"}
          </label>
          <textarea
            id={`appeal-${item.id}`}
            required
            minLength={10}
            maxLength={review ? 600 : 2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="mt-2 w-full resize-y rounded-2xl bg-background p-3 text-[14px] ring-1 ring-line"
          />
          <p className="mt-1 text-[12px] text-muted">
            Include context, without names, phone numbers or email addresses.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {review ? (
              <>
                <Button
                  type="button"
                  disabled={pending || body.trim().length < 10}
                  onClick={() => act(true)}
                >
                  Restore
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending || body.trim().length < 10}
                  onClick={() => act(false)}
                >
                  Uphold decision
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={pending || body.trim().length < 10}
              >
                {pending ? "Sending…" : "Submit appeal"}
              </Button>
            )}
          </div>
        </form>
      )}
    </article>
  );
}

export function Appeals({
  items,
  review = false,
}: {
  items: ModerationHistory;
  review?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.length ? (
        items.map((item) => (
          <Decision key={item.id} item={item} review={review} />
        ))
      ) : (
        <p className="text-[14px] text-muted">
          {review
            ? "No appeals waiting for review."
            : "No team decisions on your content. Content hidden after reports may still be awaiting review."}
        </p>
      )}
    </div>
  );
}
