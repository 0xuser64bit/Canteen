import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const relative = {
  long: new Intl.RelativeTimeFormat("en", { numeric: "auto" }),
  narrow: new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
    style: "narrow",
  }),
};
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "just now", "5 minutes ago", "yesterday"; narrow: "5m ago", "3w ago". */
export function timeAgo(
  date: Date,
  now = Date.now(),
  style: keyof typeof relative = "long",
) {
  // A clock running slightly ahead must never print "in 2 minutes".
  const seconds = Math.min(0, Math.round((date.getTime() - now) / 1000));
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size)
      return relative[style].format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/** Compact counts: 999, 1.2K, 3.4M. */
export const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
}).format;

/** "1 reply", "3 replies". */
export function plural(
  count: number,
  singular: string,
  pluralForm = `${singular}s`,
) {
  return `${compactNumber(count)} ${count === 1 ? singular : pluralForm}`;
}
