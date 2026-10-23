// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Tooltip } from "radix-ui";
import { expect, it, vi } from "vitest";
import { ModQueue } from "@/components/mod-queue";
import type { ModItem } from "@/server/queries";

const mocks = vi.hoisted(() => ({
  moderate: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("@/server/actions", () => ({ moderate: mocks.moderate }));
vi.mock("sonner", () => ({
  toast: { error: mocks.error, success: mocks.success },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it.each(["post", "comment"] as const)(
  "keeps the full reported %s readable when its thread cannot be opened",
  (target) => {
    const body = Array.from(
      { length: 20 },
      (_, index) => `Context line ${index + 1}`,
    ).join("\n");
    const item: ModItem = {
      target,
      id: "reported-content",
      title: "A reported discussion",
      body,
      image: null,
      alias: { name: "Quiet Otter", hue: 120 },
      university: { name: "A university", slug: null },
      createdAt: new Date("2026-10-20T10:00:00Z"),
      hidden: true,
      threadId: null,
      reasons: [{ reason: "OTHER", count: 3 }],
      reportCount: 3,
      urgent: false,
    };
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <Tooltip.Provider>
        <ModQueue items={[item]} />
      </Tooltip.Provider>,
    );
    const content = [...container.querySelectorAll("p")].find(
      (paragraph) => paragraph.textContent === body,
    );
    expect(content).toBeDefined();
    expect(content!.className).not.toMatch(/line-clamp|overflow-hidden/);
    expect(container.textContent).toContain("Context line 20");
    expect(container.textContent).not.toContain("Open thread");
  },
);

it("retains a moderation decision and reason after failed transport, then permits retry", async () => {
  mocks.moderate.mockRejectedValueOnce(new Error("Offline"));
  mocks.moderate.mockResolvedValue({ ok: true });
  const item: ModItem = {
    target: "post",
    id: "reported-post",
    title: "Context for review",
    body: "A reported post",
    image: null,
    alias: { name: "Quiet Otter", hue: 120 },
    university: { name: "A university", slug: null },
    createdAt: new Date(),
    hidden: true,
    threadId: null,
    reasons: [{ reason: "OTHER", count: 3 }],
    reportCount: 3,
    urgent: false,
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const button = (label: string) =>
    [...document.querySelectorAll("button")].find(
      (node) => node.textContent?.trim() === label,
    )!;
  try {
    await act(async () =>
      root.render(
        <Tooltip.Provider>
          <ModQueue items={[item]} />
        </Tooltip.Provider>,
      ),
    );
    await act(async () => button("Remove").click());
    const reason = document.querySelector("select")!;
    await act(async () => {
      reason.value = "HARASSMENT";
      reason.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const confirm = () =>
      document.querySelector<HTMLButtonElement>(
        '[role="dialog"] button.bg-danger',
      )!;
    await act(async () => confirm().click());
    expect(mocks.error).toHaveBeenCalledWith(
      "Couldn't confirm that decision. Check your connection and try again.",
    );
    expect(container.textContent).toContain(item.title);
    expect(reason.value).toBe("HARASSMENT");
    expect(confirm().disabled).toBe(false);
    await act(async () => confirm().click());
    expect(mocks.moderate).toHaveBeenLastCalledWith({
      target: "post",
      id: item.id,
      decision: "remove",
      reason: "HARASSMENT",
    });
    expect(container.textContent).toContain("No reports waiting");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
