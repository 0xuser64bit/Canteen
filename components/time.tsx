"use client";

import { timeAgo } from "@/lib/utils";

const full = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Relative time; the server and client may differ by a minute, which is fine. */
export function TimeAgo({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) {
  return (
    <time
      dateTime={date.toISOString()}
      title={full.format(date)}
      className={className}
      suppressHydrationWarning
    >
      {timeAgo(date)}
    </time>
  );
}
