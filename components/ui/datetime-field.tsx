"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { usePreferences } from "@/components/preferences";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import {
  calendarDays,
  formatDateTime,
  localDateTimeValue,
  parseLocalDateTime,
} from "@/lib/datetime";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const dayLabel = new Intl.DateTimeFormat("en", { dateStyle: "full" });
const monthLabel = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

function DeadlineEditor({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (value: string) => void;
}) {
  const { clock } = usePreferences();
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState(() => {
    const existing = parseLocalDateTime(value);
    if (existing && existing.getTime() > now) return existing;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    return tomorrow;
  });
  const [month, setMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );
  const [hour, setHour] = useState(() =>
    String(selected.getHours()).padStart(2, "0"),
  );
  const [minute, setMinute] = useState(() =>
    String(selected.getMinutes()).padStart(2, "0"),
  );
  const calendar = useRef<HTMLTableElement>(null);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const local = `${localDateTimeValue(selected).slice(0, 10)}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  const candidate =
    /^\d{1,2}$/.test(hour) && /^\d{1,2}$/.test(minute)
      ? parseLocalDateTime(local)
      : null;
  const valid = candidate !== null && candidate.getTime() > now;

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
      event.key
    ];
    if (
      offset === undefined &&
      !["Home", "End", "PageUp", "PageDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    if (offset !== undefined) date.setDate(date.getDate() + offset);
    else if (event.key === "Home") date.setDate(date.getDate() - date.getDay());
    else if (event.key === "End")
      date.setDate(date.getDate() + 6 - date.getDay());
    else {
      const day = date.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth() + (event.key === "PageUp" ? -1 : 1));
      date.setDate(
        Math.min(
          day,
          new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
        ),
      );
    }
    if (date < today) return;
    setSelected(date);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    requestAnimationFrame(() =>
      calendar.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${date.getDate()}"]`)
        ?.focus(),
    );
  }

  const days = calendarDays(month.getFullYear(), month.getMonth());
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          disabled={month <= new Date(today.getFullYear(), today.getMonth(), 1)}
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <ChevronLeft />
        </Button>
        <h3
          id="deadline-month"
          aria-live="polite"
          className="text-[15px] font-bold"
        >
          {monthLabel.format(month)}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Next month"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <ChevronRight />
        </Button>
      </div>
      <table
        ref={calendar}
        role="grid"
        aria-labelledby="deadline-month"
        className="mt-2 w-full table-fixed border-separate border-spacing-1 text-center"
      >
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th
                key={day}
                scope="col"
                className="h-8 text-[12px] font-medium text-muted"
              >
                <span aria-label={day}>{day.slice(0, 2)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: days.length / 7 }, (_, week) => (
            <tr key={week}>
              {days.slice(week * 7, week * 7 + 7).map((day, index) => {
                if (!day) return <td key={`empty-${index}`} />;
                const date = new Date(
                  month.getFullYear(),
                  month.getMonth(),
                  day,
                );
                const checked = selected.toDateString() === date.toDateString();
                const current = date.getTime() === today.getTime();
                const selectedMonth =
                  selected.getFullYear() === month.getFullYear() &&
                  selected.getMonth() === month.getMonth();
                const firstAvailable =
                  month.getTime() ===
                  new Date(today.getFullYear(), today.getMonth(), 1).getTime()
                    ? today.getDate()
                    : 1;
                const focusable =
                  checked || (!selectedMonth && day === firstAvailable);
                return (
                  <td key={day} role="gridcell" aria-selected={checked}>
                    <button
                      type="button"
                      data-day={day}
                      disabled={date < today}
                      tabIndex={focusable ? 0 : -1}
                      aria-label={dayLabel.format(date)}
                      aria-current={current ? "date" : undefined}
                      onClick={() => setSelected(date)}
                      onKeyDown={(event) => moveFocus(event, date)}
                      className={cn(
                        "grid aspect-square w-full cursor-pointer place-items-center rounded-full text-[14px] font-medium tabular transition-colors hover:bg-surface-3 disabled:cursor-default disabled:text-muted disabled:opacity-40",
                        checked &&
                          "bg-you font-bold text-you-ink hover:bg-you-hover",
                        current &&
                          !checked &&
                          "ring-1 ring-line-strong ring-inset",
                      )}
                    >
                      {day}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <fieldset className="mt-5 border-t border-line pt-4">
        <legend className="sr-only">Deadline time</legend>
        <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
          <Clock3 aria-hidden className="size-4" /> Local time · 24-hour clock
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[12px] text-muted">
            Hour (00–23)
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={23}
              step={1}
              value={hour}
              onChange={(event) => setHour(event.target.value)}
              className="mt-1 tabular"
            />
          </label>
          <label className="text-[12px] text-muted">
            Minute (00–59)
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              step={1}
              value={minute}
              onChange={(event) => setMinute(event.target.value)}
              className="mt-1 tabular"
            />
          </label>
        </div>
      </fieldset>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        {Intl.DateTimeFormat().resolvedOptions().timeZone}. Other students see
        this deadline in their own local time.
      </p>
      <p
        role="status"
        className={cn(
          "mt-3 min-h-10 text-[13px]",
          valid ? "text-muted" : "text-danger",
        )}
      >
        {valid
          ? formatDateTime(candidate, clock)
          : "Choose a valid date and time in the future."}
      </p>
      <Button
        type="button"
        variant="primary"
        className="mt-2 w-full"
        disabled={!valid}
        onClick={() => {
          const current = Date.now();
          setNow(current);
          if (candidate && candidate.getTime() > current) onSelect(local);
        }}
      >
        Set deadline
      </Button>
    </>
  );
}

export function DateTimeField({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const { clock } = usePreferences();
  const date = parseLocalDateTime(value);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id={id}
          type="button"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="h-auto min-h-12 w-full justify-start rounded-2xl px-4 py-3 text-left whitespace-normal aria-invalid:ring-danger"
        >
          <CalendarDays aria-hidden />
          <span
            className={cn("min-w-0 flex-1", !date && "font-normal text-muted")}
            suppressHydrationWarning
          >
            {date ? formatDateTime(date, clock) : "Choose date & time"}
          </span>
        </Button>
      </DialogTrigger>
      {open && (
        <DialogContent
          title="Application deadline"
          description="Choose when applications close, in your local time."
        >
          <DeadlineEditor
            value={value}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
