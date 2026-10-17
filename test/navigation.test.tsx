// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import AppLayout from "@/app/(app)/layout";
import { NavigationLink } from "@/components/navigation-link";

const mocks = vi.hoisted(() => ({
  pending: false,
  after: vi.fn(),
  recordActivity: vi.fn(),
  viewer: {
    id: "local-student",
    university: { name: "Example University", slug: "example" },
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, href, className }: ComponentProps<"a">) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: mocks.pending }),
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/session", () => ({
  requireViewer: async () => mocks.viewer,
  getDraftOwner: async () => "opaque-session-owner",
}));
vi.mock("@/server/metrics", () => ({ recordActivity: mocks.recordActivity }));
vi.mock("@/server/queries", () => ({
  getUnreadCount: async () => 0,
  getModQueueSize: async () => 0,
  isModerator: () => false,
}));
vi.mock("@/components/discover", () => ({ Discover: () => null }));
vi.mock("@/components/draft-boundary", () => ({ DraftBoundary: () => null }));
vi.mock("@/components/nav", () => ({
  SideNav: () => null,
  MobileNav: () => null,
}));
vi.mock("@/components/search", () => ({ SearchPalette: () => null }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => vi.clearAllMocks());

it("renders navigation without waiting for an activity write", async () => {
  mocks.recordActivity.mockReturnValue(new Promise(() => {}));
  const content = <p>Current page</p>;
  const layout = await AppLayout({
    children: content,
    params: Promise.resolve({}),
  });
  expect(layout).toBeDefined();
  expect(mocks.recordActivity).not.toHaveBeenCalled();
  expect(mocks.after).toHaveBeenCalledOnce();
  mocks.after.mock.calls[0]![0]();
  expect(mocks.recordActivity).toHaveBeenCalledWith(mocks.viewer);
});

it("keeps a normal link and announces slow navigation without moving its label", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const link = () => (
    <NavigationLink href="/me?collection=saved" scroll={false} prefetch>
      Saved
    </NavigationLink>
  );
  try {
    mocks.pending = false;
    await act(async () => root.render(link()));
    const anchor = container.querySelector("a")!;
    expect(anchor.getAttribute("href")).toBe("/me?collection=saved");
    expect(container.querySelector('[role="status"]')!.textContent).toBe("");
    mocks.pending = true;
    await act(async () => root.render(link()));
    expect(container.querySelector("a")).toBe(anchor);
    expect(container.querySelector('[role="status"]')!.textContent).toBe(
      "Opening…",
    );
    expect(anchor.firstChild!.textContent).toBe("Saved");
    mocks.pending = false;
    await act(async () => root.render(link()));
    expect(container.querySelector('[role="status"]')!.textContent).toBe("");
  } finally {
    await act(async () => root.unmount());
  }
});
