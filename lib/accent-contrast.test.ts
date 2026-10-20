import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { PREFERENCE_OPTIONS } from "./preferences";

const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
type Lab = [number, number, number];

function declarations(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing palette: ${selector}`);
  return Object.fromEntries(
    [
      ...css
        .slice(start, css.indexOf("}", start))
        .matchAll(/(--[\w-]+):\s*([^;]+);/g),
    ].map(([, key, value]) => [key!, value!.trim()]),
  );
}

function palette(accent: string, mode: "light" | "soft" | "vivid") {
  const tokens = {
    ...declarations(":root"),
    ...(mode !== "light" ? declarations(".dark") : {}),
    ...(accent !== "yellow"
      ? declarations(`:root[data-accent="${accent}"]`)
      : {}),
    ...(mode === "vivid"
      ? declarations(':root.dark[data-intensity="vivid"]')
      : {}),
  };
  function resolve(value: string): string {
    return value.replace(/var\((--[\w-]+)\)/g, (_, key: string) =>
      resolve(tokens[key]!),
    );
  }
  function lab(value: string): Lab {
    const color = resolve(value);
    const lch = color.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
    if (lch) {
      const [, l, c, h] = lch;
      const radians = (Number(h) * Math.PI) / 180;
      return [
        Number(l),
        Number(c) * Math.cos(radians),
        Number(c) * Math.sin(radians),
      ];
    }
    const mix = color.match(
      /^color-mix\(in oklab,\s*(oklch\([^)]+\)) ([\d.]+)%,\s*(oklch\([^)]+\))\)$/,
    );
    if (!mix) throw new Error(`Unsupported palette value: ${color}`);
    const first = lab(mix[1]!);
    const second = lab(mix[3]!);
    const share = Number(mix[2]) / 100;
    return first.map(
      (channel, index) => channel * share + second[index]! * (1 - share),
    ) as Lab;
  }
  return (key: string) => lab(tokens[key]!);
}

// Oklab to linear sRGB: https://www.w3.org/TR/css-color-4/#color-conversion-code
function luminance([l, a, b]: Lab) {
  const x = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const y = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const z = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z,
    -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
    -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z,
  ].map((channel) => Math.max(0, Math.min(1, channel)));
  return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
}

function contrast(first: Lab, second: Lab) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const accent of PREFERENCE_OPTIONS.accent) {
  it.each(["light", "soft", "vivid"] as const)(
    `keeps ${accent} message text, timestamps and actions readable in %s mode`,
    (mode) => {
      const color = palette(accent, mode);
      expect(
        contrast(color("--you-surface"), color("--you-surface-ink")),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(color("--you-surface"), color("--you-surface-muted")),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(color("--you"), color("--you-ink")),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it(`makes ${accent} soft messages substantially darker without fading their text`, () => {
    const soft = palette(accent, "soft");
    const vivid = palette(accent, "vivid");
    expect(luminance(soft("--you-surface"))).toBeLessThan(0.08);
    expect(luminance(soft("--you-surface"))).toBeLessThan(
      luminance(vivid("--you-surface")) * 0.25,
    );
    expect(luminance(soft("--you-surface-ink"))).toBeGreaterThan(0.7);
  });
}
