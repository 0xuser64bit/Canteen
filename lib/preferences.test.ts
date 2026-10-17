import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  preferencesScript,
} from "./preferences";

describe("device preferences", () => {
  it.each([null, "{broken", "null", "42", '"dark"', "[]"])(
    "recovers from missing or invalid storage: %s",
    (raw) => expect(parsePreferences(raw)).toEqual(DEFAULT_PREFERENCES),
  );

  it("validates each field and drops unknown keys", () => {
    expect(
      parsePreferences(
        JSON.stringify({
          accent: "blue",
          clock: "24",
          motion: "reduce",
          intensity: "transparent",
          wallpaper: false,
          injected: "<script>",
        }),
      ),
    ).toEqual({
      ...DEFAULT_PREFERENCES,
      accent: "blue",
      clock: "24",
      motion: "reduce",
    });
  });

  it.each([false, true])(
    "applies safe first-paint attributes even when storage is blocked: %s",
    (blocked) => {
      const attributes: Record<string, string> = {};
      runInNewContext(preferencesScript, {
        localStorage: {
          getItem: () => {
            if (blocked) throw new Error("Storage blocked");
            return '{"accent":"violet","motion":"reduce"}';
          },
        },
        document: {
          documentElement: {
            setAttribute: (key: string, value: string) => {
              attributes[key] = value;
            },
          },
        },
      });
      expect(attributes["data-accent"]).toBe(blocked ? "yellow" : "violet");
      expect(attributes["data-motion"]).toBe(blocked ? "system" : "reduce");
      expect(Object.keys(attributes)).toHaveLength(6);
    },
  );

  it("gives every selectable accent a matching CSS palette", () => {
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    );
    for (const accent of ["blue", "green", "rose", "violet", "orange"]) {
      expect(css).toContain(`[data-accent="${accent}"]`);
    }
  });
});
