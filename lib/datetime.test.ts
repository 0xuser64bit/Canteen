import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  calendarDays,
  formatDateTime,
  localDateTimeValue,
  parseLocalDateTime,
} from "./datetime";

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
