import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREFERENCES_KEY } from "@/lib/preferences";

describe("browser preference persistence", () => {
  const attributes: Record<string, string> = {};
  const values = new Map<string, string>();

  beforeEach(() => {
    vi.resetModules();
    values.clear();
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("document", {
      documentElement: {
        setAttribute: (key: string, value: string) => {
          attributes[key] = value;
        },
      },
    });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("merges edits, persists them, and updates the whole interface", async () => {
    const { savePreferences } = await import("./preferences");
    const onChange = vi.fn();
    window.addEventListener("canteen:preferences-changed", onChange);
    expect(savePreferences({ accent: "green" })).toBe(true);
    expect(savePreferences({ clock: "24" })).toBe(true);
    expect(JSON.parse(values.get(PREFERENCES_KEY)!)).toMatchObject({
      accent: "green",
      clock: "24",
    });
    expect(attributes["data-accent"]).toBe("green");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("keeps session changes when storage can be read but quota blocks writes", async () => {
    values.set(PREFERENCES_KEY, '{"accent":"yellow","motion":"system"}');
    localStorage.setItem = () => {
      throw new Error("Quota exceeded");
    };
    const { savePreferences, reducedMotion } = await import("./preferences");
    expect(savePreferences({ accent: "blue", motion: "reduce" })).toBe(false);
    expect(savePreferences({ clock: "12" })).toBe(false);
    expect(attributes["data-accent"]).toBe("blue");
    expect(attributes["data-clock"]).toBe("12");
    expect(reducedMotion()).toBe(true);
  });

  it("respects device reduced motion even when animation follows the device", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const { reducedMotion } = await import("./preferences");
    expect(reducedMotion()).toBe(true);
  });
});
