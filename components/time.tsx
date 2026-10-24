"use client";

import { Clock } from "lucide-react";
import { Tooltip } from "radix-ui";
import { useSyncExternalStore } from "react";
import { usePreferences } from "@/components/preferences";
import { deadlineLabel, formatDateTime } from "@/lib/datetime";
import { cn, timeAgo } from "@/lib/utils";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function subscribeClock(onChange: () => void) {
  listeners.add(onChange);
  timer ??= setInterval(
    () => listeners.forEach((listener) => listener()),
    60_000,
  );
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}
const minuteSnapshot = () => Math.floor(Date.now() / 60_000);

/** The shared minute clock as a timestamp, for actions that close after a while. */
export function useMinuteClock() {
  return (
    useSyncExternalStore(subscribeClock, minuteSnapshot, minuteSnapshot) *
    60_000
  );
}

/** Marks text its author changed after publishing, with the time in the title. */
export function Edited({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) {
  const { clock } = usePreferences();
  return (
    <span
      title={`Edited ${formatDateTime(date, clock)}`}
      className={className}
      suppressHydrationWarning
    >
      edited
    </span>
  );
}

/** One shared clock keeps all visible relative times fresh. */
export function TimeAgo({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) {
  const preferences = usePreferences();
  const minute = useSyncExternalStore(
    subscribeClock,
    minuteSnapshot,
    minuteSnapshot,
  );
  const full = formatDateTime(date, preferences.clock);
  const exact = preferences.timestamps === "exact";
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <time
          dateTime={date.toISOString()}
          tabIndex={0}
          // Narrow units ("5m ago") read ambiguously aloud; the label keeps the words.
          aria-label={exact ? undefined : timeAgo(date, minute * 60_000)}
          className={cn("max-w-full cursor-help rounded-sm", className)}
          suppressHydrationWarning
        >
          {exact ? full : timeAgo(date, minute * 60_000, "narrow")}
        </time>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 max-w-[calc(100vw-2rem)] rounded-xl bg-ink px-3 py-2 text-[12px] font-medium text-background shadow-pop"
          suppressHydrationWarning
        >
          {full} · your local time
          <Tooltip.Arrow className="fill-ink" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** An opportunity's countdown, refreshed by the shared minute clock. */
export function Deadline({
  date,
  className,
  urgentClassName,
}: {
  date: Date;
  className?: string;
  urgentClassName?: string;
}) {
  const { clock } = usePreferences();
  const minute = useSyncExternalStore(
    subscribeClock,
    minuteSnapshot,
    minuteSnapshot,
  );
  const { text, urgent } = deadlineLabel(date, minute * 60_000);
  return (
    <time
      dateTime={date.toISOString()}
      title={`${formatDateTime(date, clock)} · your local time`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap",
        className,
        urgent && urgentClassName,
      )}
      suppressHydrationWarning
    >
      <Clock aria-hidden className="size-3.5" />
      {text}
    </time>
  );
}

export function DateTime({ date }: { date: string | Date }) {
  const { clock } = usePreferences();
  const value = new Date(date);
  return (
    <time dateTime={value.toISOString()} suppressHydrationWarning>
      {formatDateTime(value, clock)}
    </time>
  );
}
