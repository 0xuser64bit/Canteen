"use client";

import { Check } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { votePoll } from "@/server/actions";
import type { Poll } from "@/server/queries";

/**
 * Tap a choice to vote; results appear once you have. Your pick is drawn in
 * yellow because it's your voice. On your own yellow bubble it's a darker tint.
 */
export function PollView({
  postId,
  poll: initial,
  onYellow,
}: {
  postId: string;
  poll: Poll;
  onYellow?: boolean;
}) {
  const [confirmed, setConfirmed] = useState({
    source: initial,
    value: initial,
  });
  if (confirmed.source !== initial)
    setConfirmed({ source: initial, value: initial });
  const [poll, choose] = useOptimistic(
    confirmed.value,
    (current, choice: string) => ({ ...current, choice }),
  );
  const [pending, startTransition] = useTransition();
  const revealed = poll.options.some((option) => option.votes !== null);

  const vote = (optionId: string) => {
    if (optionId === poll.choice || pending) return;
    startTransition(async () => {
      choose(optionId);
      try {
        const result = await votePoll(postId, optionId);
        if (!result.ok) toast.error(result.error);
        else setConfirmed((current) => ({ ...current, value: result.data }));
      } catch {
        toast.error("That vote didn't go through. Try again.");
      }
    });
  };

  return (
    <div className="relative z-10 mt-3 flex flex-col gap-2">
      {poll.options.map((option) => {
        const chosen = poll.choice === option.id;
        const share =
          revealed && poll.total > 0
            ? Math.round(((option.votes ?? 0) / poll.total) * 100)
            : 0;
        return (
          <button
            key={option.id}
            type="button"
            disabled={pending}
            onClick={() => vote(option.id)}
            aria-pressed={chosen}
            className={cn(
              "relative flex min-h-11 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl px-4 py-2.5 text-left text-[15px] font-semibold transition-shadow ring-inset",
              onYellow
                ? "ring-1 ring-you-surface-ink/20 hover:ring-you-surface-ink/40"
                : "bg-surface ring-1 ring-line hover:ring-line-strong",
              chosen &&
                (onYellow ? "ring-2 ring-you-surface-ink" : "ring-2 ring-ink"),
            )}
          >
            {revealed && (
              <span
                aria-hidden
                style={{ width: `${share}%` }}
                className={cn(
                  "absolute inset-y-0 left-0 transition-[width] duration-500 ease-out-quart",
                  chosen
                    ? onYellow
                      ? "bg-you-surface-ink/15"
                      : // Light text needs a tinted accent bar in dark mode.
                        "bg-you dark:bg-you/25"
                    : onYellow
                      ? "bg-you-surface-ink/[0.07]"
                      : "bg-surface-3",
                )}
              />
            )}
            <span className="relative min-w-0 flex-1 break-words">
              {option.label}
            </span>
            {chosen && <Check className="relative size-4 shrink-0" />}
            {revealed && (
              <span className="relative text-[13px] tabular">{share}%</span>
            )}
          </button>
        );
      })}
      <p
        className={cn(
          "px-1 text-[12px] font-medium",
          onYellow ? "text-you-surface-muted" : "text-muted",
        )}
        aria-live="polite"
      >
        {poll.total} {poll.total === 1 ? "vote" : "votes"} ·{" "}
        {!revealed
          ? "Vote to see results"
          : poll.choice
            ? "Tap another choice to change your vote"
            : "Results so far"}
      </p>
    </div>
  );
}
