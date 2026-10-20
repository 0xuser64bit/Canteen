// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { Settings } from "@/components/settings";
import { PREFERENCES_KEY } from "@/lib/preferences";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", resolvedTheme: "dark", setTheme: vi.fn() }),
}));
vi.mock("@/components/time", () => ({ TimeAgo: () => null }));
vi.mock("sonner", () => ({ toast: { message: vi.fn(), success: vi.fn() } }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("applies and restores the selected yellow dark-mode intensity through the actual settings controls", async () => {
  localStorage.setItem(
    PREFERENCES_KEY,
    '{"accent":"yellow","intensity":"soft"}',
  );
  document.documentElement.classList.add("dark");
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const intensity = (value: string) =>
    container.querySelector<HTMLInputElement>(
      `input[name="intensity"][value="${value}"]`,
    )!;
  try {
    await act(async () => root.render(<Settings />));
    expect(intensity("soft").checked).toBe(true);
    await act(async () => intensity("vivid").click());
    expect(document.documentElement.dataset.intensity).toBe("vivid");
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toMatchObject({
      accent: "yellow",
      intensity: "vivid",
    });
    await act(async () => intensity("soft").click());
    expect(document.documentElement.dataset.intensity).toBe("soft");
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toMatchObject({
      accent: "yellow",
      intensity: "soft",
    });
    await act(async () => root.unmount());
    const restored = createRoot(container);
    try {
      await act(async () => restored.render(<Settings />));
      expect(intensity("soft").checked).toBe(true);
      expect(
        container.querySelector(
          '[aria-label="Live appearance preview"] .bg-you-surface',
        ),
      ).not.toBeNull();
    } finally {
      await act(async () => restored.unmount());
    }
  } finally {
    container.remove();
    localStorage.removeItem(PREFERENCES_KEY);
    document.documentElement.classList.remove("dark");
  }
});
