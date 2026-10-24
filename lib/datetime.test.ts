import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  calendarDays,
  deadlineLabel,
  formatDateTime,
  localDateTimeValue,
  parseLocalDateTime,
} from "./datetime";

describe("deadline labels", () => {
  const now = new Date(2026, 9, 24, 12, 0).getTime();
  const at = (minutes: number) => new Date(now + minutes * 60_000);

  it("counts down without overstating the time left", () => {
    expect(deadlineLabel(at(1), now)).toEqual({
      text: "Closes in 1 minute",
      urgent: true,
      closed: false,
    });
    expect(deadlineLabel(at(119), now).text).toBe("Closes in 1 hour");
    expect(deadlineLabel(at(47 * 60 + 59), now).text).toBe(
      "Closes in 47 hours",
    );
    expect(deadlineLabel(at(48 * 60), now)).toEqual({
      text: "Closes in 2 days",
      urgent: false,
      closed: false,
    });
    expect(deadlineLabel(at(7 * 24 * 60 - 1), now).text).toBe(
      "Closes in 6 days",
    );
    // Further out, a calendar date reads better than a count of days.
    expect(deadlineLabel(at(10 * 24 * 60), now).text).toMatch(
      /^Closes (?!in )/,
    );
  });

  it("reports a passed deadline as closed", () => {
    expect(deadlineLabel(at(0), now)).toEqual({
      text: "Closed",
      urgent: false,
      closed: true,
    });
    expect(deadlineLabel(at(-60), now).closed).toBe(true);
  });
});

describe("local dates and clocks", () => {
  it("round-trips local wall-clock values without a UTC shift", () => {
    const date = new Date(2028, 1, 29, 23, 45);
    expect(localDateTimeValue(date)).toBe("2028-02-29T23:45");
    expect(parseLocalDateTime("2028-02-29T23:45")?.getTime()).toBe(
      date.getTime(),
    );
  });

  it.each([
    "",
    "2027-02-29T12:00",
    "2026-04-31T12:00",
    "2026-13-01T12:00",
    "2026-01-01T24:30",
    "2026-01-01T12:60",
    "2026-01-01T12:00Z",
  ])("rejects invalid local date/time: %s", (value) =>
    expect(parseLocalDateTime(value)).toBeNull(),
  );

  it("rejects skipped DST times and preserves the selected local day across timezones", () => {
    const result = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import assert from 'node:assert/strict';
      import { parseLocalDateTime, localDateTimeValue } from './lib/datetime.ts';
      assert.equal(parseLocalDateTime('2026-03-08T02:30'), null);
      const date = parseLocalDateTime('2026-10-18T00:15');
      assert.equal(date.toISOString(), '2026-10-18T04:15:00.000Z');
      assert.equal(localDateTimeValue(date), '2026-10-18T00:15');
    `,
      ],
      { cwd: process.cwd(), env: { ...process.env, TZ: "America/New_York" } },
    );
    expect(result.toString()).toBe("");
  });

  it("uses the requested 12- or 24-hour clock", () => {
    const date = new Date(2026, 9, 17, 21, 5);
    expect(formatDateTime(date, "12")).toMatch(/9:05/);
    expect(formatDateTime(date, "24")).toMatch(/21:05/);
  });
});

describe("calendar month", () => {
  it("aligns Sunday-starting months and includes every day", () => {
    const days = calendarDays(2026, 1);
    expect(days).toHaveLength(28);
    expect(days[0]).toBe(1);
    expect(days.at(-1)).toBe(28);
  });

  it("pads both ends and handles leap years and year boundaries", () => {
    const days = calendarDays(2028, 1);
    expect(days.slice(0, 2)).toEqual([null, null]);
    expect(days.filter(Boolean)).toHaveLength(29);
    expect(days.length % 7).toBe(0);
    expect(calendarDays(2026, 12)).toEqual(calendarDays(2027, 0));
  });
});
