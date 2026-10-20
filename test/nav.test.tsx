// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MobileNav, SideNav } from "@/components/nav";

const route = vi.hoisted(() => ({ pathname: "/home", topic: "opportunities" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useSearchParams: () =>
    new URLSearchParams(route.topic ? { topic: route.topic } : {}),
}));
vi.mock("@/components/navigation-link", () => ({
  NavigationLink: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/components/search", () => ({ openSearch: vi.fn() }));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  route.pathname = "/home";
  route.topic = "opportunities";
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
});

it("keeps Feed active for Opportunities on mobile while desktop selects Opportunities", async () => {
  await act(async () => root.render(<MobileNav unread={0} />));
  expect(
    container.querySelector('a[aria-current="page"]')?.getAttribute("href"),
  ).toBe("/home");
  expect(container.querySelectorAll('a[aria-current="page"]')).toHaveLength(1);
  await act(async () =>
    root.render(
      <SideNav unread={0} university="Example University" team={false} />,
    ),
  );
  expect(
    container.querySelector('a[aria-current="page"]')?.getAttribute("href"),
  ).toBe("/home?topic=opportunities");
  expect(container.querySelectorAll('a[aria-current="page"]')).toHaveLength(1);
});

it("keeps You active in Settings and lets threads own the bottom of the screen", async () => {
  route.pathname = "/settings";
  route.topic = "";
  await act(async () => root.render(<MobileNav unread={0} />));
  expect(
    container.querySelector('a[aria-current="page"]')?.getAttribute("href"),
  ).toBe("/me");
  route.pathname = "/p/a-thread";
  await act(async () => root.render(<MobileNav unread={0} />));
  expect(container.querySelector("nav")).toBeNull();
});
