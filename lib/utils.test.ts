import { describe, expect, it } from "vitest";
import { compactNumber, timeAgo } from "./utils";

describe("timeAgo", () => {
  const now = new Date("2026-01-10T12:00:00Z").getTime();
  it("formats recent and older dates", () => {
    expect(timeAgo(new Date(now - 10_000), now)).toBe("just now");
    expect(timeAgo(new Date(now - 5 * 60_000), now)).toBe("5 minutes ago");
    expect(timeAgo(new Date(now - 26 * 3600_000), now)).toBe("yesterday");
    expect(timeAgo(new Date(now - 15 * 24 * 3600_000), now)).toBe(
      "2 weeks ago",
    );
  });

  it("has a compact form for meta lines", () => {
    expect(timeAgo(new Date(now - 10_000), now, "narrow")).toBe("just now");
    expect(timeAgo(new Date(now - 5 * 60_000), now, "narrow")).toBe("5m ago");
    expect(timeAgo(new Date(now - 26 * 3600_000), now, "narrow")).toBe(
      "yesterday",
    );
    expect(timeAgo(new Date(now - 15 * 24 * 3600_000), now, "narrow")).toBe(
      "2w ago",
    );
  });
});

describe("compactNumber", () => {
  it("abbreviates large counts", () => {
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(1234)).toBe("1.2K");
  });
});
