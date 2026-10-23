// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { Tooltip } from "radix-ui";
import { expect, it, vi } from "vitest";
import { ModQueue } from "@/components/mod-queue";
import type { ModItem } from "@/server/queries";

vi.mock("@/server/actions", () => ({ moderate: vi.fn() }));

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
