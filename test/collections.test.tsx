// @vitest-environment happy-dom
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MePage from "@/app/(app)/me/page";
import type { FeedPage } from "@/server/queries";

const mocks = vi.hoisted(() => ({
  getFeed: vi.fn(),
  viewer: { id: "viewer-one" },
}));
vi.mock("@/server/queries", () => ({ getFeed: mocks.getFeed }));
vi.mock("@/lib/session", () => ({ requireViewer: async () => mocks.viewer }));
vi.mock("@/components/feed", () => ({
  Feed: ({ initial, empty }: { initial: FeedPage; empty: ReactNode }) =>
    initial.items.length === 0 ? empty : null,
}));
vi.mock("@/components/navigation-link", () => ({
  NavigationLink: ({
    children,
    href,
    className,
    ...props
  }: ComponentProps<"a">) => (
    <a href={href} className={className} aria-current={props["aria-current"]}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/page-header", () => ({ FeedControls: () => null }));
vi.mock("@/app/(app)/me/loading", () => ({ default: () => null }));

let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getFeed.mockResolvedValue({ items: [], nextCursor: null });
  container = document.createElement("div");
  document.body.append(container);
});
afterEach(() => container.remove());

// Resolve server-only children before rendering the page's public UI.
async function resolveServerTree(node: ReactNode): Promise<ReactNode> {
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;
  if (
    typeof node.type === "function" &&
    node.type.constructor.name === "AsyncFunction"
  ) {
    const Component = node.type as (props: unknown) => Promise<ReactNode>;
    return resolveServerTree(await Component(node.props));
  }
  if (node.props.children === undefined) return node;
  const children = await Promise.all(
    Children.toArray(node.props.children).map(resolveServerTree),
  );
  return cloneElement(node, undefined, ...children);
}
async function render(searchParams: Record<string, string> = {}) {
  const page = await MePage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(searchParams),
  });
  container.innerHTML = renderToStaticMarkup(await resolveServerTree(page));
}
function link(label: string) {
  const result = [...container.querySelectorAll("a")].find(
    (item) => item.textContent === label,
  );
  if (!result) throw new Error(`Missing link: ${label}`);
  return result;
}

it("identifies the saved filter and links opportunities to the closing-soon view", async () => {
  await render({ collection: "saved" });
  expect(link("All saved").getAttribute("aria-current")).toBe("page");
  expect(link("Opportunities").getAttribute("aria-current")).toBeNull();
  expect(link("Opportunities").getAttribute("href")).toBe(
    "/me?collection=saved&topic=opportunities&sort=closing",
  );
  expect(mocks.getFeed).toHaveBeenCalledWith(mocks.viewer, {
    scope: { kind: "saved" },
    topic: undefined,
    sort: "newest",
  });
});

it("explains a filtered empty result and offers a link that clears both filters", async () => {
  await render({
    collection: "saved",
    topic: "opportunities",
    sort: "closing",
  });
  expect(link("Opportunities").getAttribute("aria-current")).toBe("page");
  expect(link("All saved").getAttribute("aria-current")).toBeNull();
  expect(container.textContent).toContain("No opportunities closing soon");
  expect(container.textContent).toContain("upcoming deadline");
  expect(link("All saved posts").getAttribute("href")).toBe(
    "/me?collection=saved",
  );
  expect(mocks.getFeed).toHaveBeenCalledWith(mocks.viewer, {
    scope: { kind: "saved" },
    topic: "OPPORTUNITIES",
    sort: "closing",
  });
});

it.each([
  ["mine", "No posts to show yet", "Ask a question", "/new"],
  ["saved", "Save a conversation for later", "Find a conversation", "/campus"],
  ["following", "Keep a thread close", "Find a conversation", "/campus"],
])(
  "gives the %s collection its own explanation and next step",
  async (collection, title, action, href) => {
    await render({ collection });
    expect(container.querySelector("h3")?.textContent).toBe(title);
    expect(link(action).getAttribute("href")).toBe(href);
  },
);

it("does not describe an opportunity filter as an empty saved collection", async () => {
  await render({ collection: "saved", topic: "opportunities" });
  expect(container.textContent).toContain("No opportunities here yet");
  expect(container.textContent).not.toContain("Choose Save privately");
  expect(link("All saved posts").getAttribute("href")).toBe(
    "/me?collection=saved",
  );
});
