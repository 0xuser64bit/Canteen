import { describe, expect, it } from "vitest";
import { pseudonym } from "./pseudonym";

describe("pseudonym", () => {
  it("is stable for the same student in the same thread", () => {
    expect(pseudonym("user-1", "post-1")).toEqual(
      pseudonym("user-1", "post-1"),
    );
  });

  it("changes across threads so activity can't be linked", () => {
    const names = new Set(
      Array.from(
        { length: 20 },
        (_, i) => pseudonym("user-1", `post-${i}`).name,
      ),
    );
    expect(names.size).toBeGreaterThan(15);
  });

  it("distinguishes students within a thread", () => {
    expect(pseudonym("user-1", "post-1").name).not.toBe(
      pseudonym("user-2", "post-1").name,
    );
  });

  it("returns a readable two-word name and a hue", () => {
    const { name, hue } = pseudonym("user-1", "post-1");
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });
});
