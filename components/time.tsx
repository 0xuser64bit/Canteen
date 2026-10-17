"use client";

import { Tooltip } from "radix-ui";
import { useSyncExternalStore } from "react";
import { usePreferences } from "@/components/preferences";
import { formatDateTime } from "@/lib/datetime";
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
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <time
          dateTime={date.toISOString()}
          tabIndex={0}
          className={cn("cursor-help rounded-sm", className)}
          suppressHydrationWarning
        >
          {preferences.timestamps === "exact"
            ? full
            : timeAgo(date, minute * 60_000)}
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

export function DateTime({ date }: { date: string | Date }) {
  const { clock } = usePreferences();
  const value = new Date(date);
  return (
    <time dateTime={value.toISOString()} suppressHydrationWarning>
      {formatDateTime(value, clock)}
    </time>
  );
}
