import type { Preferences } from "./preferences";

export function formatDateTime(date: Date, clock: Preferences["clock"]) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(clock === "auto" ? {} : { hour12: clock === "12" }),
  }).format(date);
}

/** datetime-local is a wall-clock value, never an ISO string in UTC. */
export function localDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseLocalDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  // Reject overflow dates and local times skipped when daylight saving begins.
  return Number.isFinite(date.getTime()) && localDateTimeValue(date) === value
    ? date
    : null;
}

export function calendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from(
    { length: Math.ceil((first.getDay() + days) / 7) * 7 },
    (_, index) => {
      const day = index - first.getDay() + 1;
      return day > 0 && day <= days ? day : null;
    },
  );
}
