// @vitest-environment happy-dom
import { act, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Feed } from "@/components/feed";
import { LikeButton } from "@/components/post";
import { PollView } from "@/components/poll";
import { PostMenu } from "@/components/post-menu";
import type { Poll, PostSummary } from "@/server/queries";

const mocks = vi.hoisted(() => ({
  loadMore: vi.fn(),
  like: vi.fn(),
  vote: vi.fn(),
  collection: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("@/server/actions", () => ({
  loadMore: mocks.loadMore,
  setLike: mocks.like,
  votePoll: mocks.vote,
  setCollection: mocks.collection,
  reportContent: vi.fn(),
  deletePost: vi.fn(),
  deleteComment: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/campus",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/time", () => ({ TimeAgo: () => null }));
vi.mock("sonner", () => ({
  toast: { error: mocks.error, success: mocks.success },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  mocks.collection.mockResolvedValue({ ok: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
const render = async (node: ReactNode) => act(async () => root.render(node));
const click = async (node: HTMLElement) => act(async () => node.click());
function button(label: string, within: ParentNode = document) {
  const result = [...within.querySelectorAll<HTMLButtonElement>("button")].find(
    (node) =>
      node.textContent?.trim() === label ||
      node.getAttribute("aria-label") === label,
  );
  if (!result) throw new Error(`Missing button: ${label}`);
  return result;
}
async function openMenu() {
  await act(async () =>
    button("More actions").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ),
  );
}
async function select(label: string) {
  const item = [
    ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ].find((node) => node.textContent?.trim() === label);
  if (!item) throw new Error(`Missing menu item: ${label}`);
  await click(item);
}

const poll: Poll = {
  options: [
    { id: "yes", label: "Yes", votes: null },
    { id: "no", label: "No", votes: null },
  ],
  total: 0,
  choice: null,
};
const voted: Poll = {
  options: [
    { id: "yes", label: "Yes", votes: 1 },
    { id: "no", label: "No", votes: 0 },
  ],
  total: 1,
  choice: "yes",
};
function post(id: string): PostSummary {
  return {
    id,
    title: `Question ${id}`,
    excerpt: "Some useful context",
    image: null,
    applicationUrl: null,
    deadline: null,
    closed: false,
    kind: "QUESTION",
    helpfulCommentId: null,
    topic: "GENERAL",
    audience: "CAMPUS",
    createdAt: new Date(),
    university: { name: "Campus", slug: null },
    alias: { name: "Quiet Otter", hue: 100 },
    isMine: false,
    liked: false,
    likeCount: 0,
    commentCount: 0,
    viewCount: 1,
    hidden: false,
    revision: 1,
    saved: false,
    following: false,
    staff: false,
    poll: null,
  };
}

it("retains successful likes and revealed poll results on a loaded feed page", async () => {
  mocks.loadMore.mockResolvedValue({
    ok: true,
    data: { items: [{ ...post("second"), poll }], nextCursor: null },
  });
  mocks.like.mockResolvedValue({
    ok: true,
    data: { liked: true, likeCount: 1 },
  });
  mocks.vote.mockResolvedValue({ ok: true, data: voted });
  await render(
    <Feed
      initial={{ items: [post("first")], nextCursor: "page-two" }}
      scope="campus"
      empty={null}
    />,
  );
  await click(button("Load more"));
  const loaded = container.querySelectorAll("article")[1]!;
  await click(button("Like", loaded));
  expect(button("Unlike", loaded).getAttribute("aria-pressed")).toBe("true");
  expect(button("Unlike", loaded).textContent).toBe("1");
  await click(button("Yes", loaded));
  expect(loaded.textContent).toContain("1 vote");
  expect(loaded.textContent).toContain("100%");
  expect(button("Yes100%", loaded).getAttribute("aria-pressed")).toBe("true");
});

it("keeps a confirmed like after a later transport failure and accepts new server counts", async () => {
  mocks.like.mockResolvedValueOnce({
    ok: true,
    data: { liked: true, likeCount: 1 },
  });
  await render(<LikeButton postId="post" liked={false} count={0} />);
  await click(button("Like"));
  mocks.like.mockRejectedValueOnce(new Error("Offline"));
  await click(button("Unlike"));
  expect(button("Unlike").getAttribute("aria-pressed")).toBe("true");
  expect(button("Unlike").textContent).toBe("1");
  expect(mocks.error).toHaveBeenCalledWith(
    "That like didn't go through. Try again.",
  );
  await render(<LikeButton postId="post" liked={true} count={4} />);
  expect(button("Unlike").textContent).toBe("4");
});

it("keeps a confirmed poll vote after a rejected change and accepts fresh server results", async () => {
  mocks.vote.mockResolvedValueOnce({ ok: true, data: voted });
  await render(<PollView postId="post" poll={poll} />);
  await click(button("Yes"));
  mocks.vote.mockResolvedValueOnce({ ok: false, error: "Try again" });
  await click(button("No0%"));
  expect(button("Yes100%").getAttribute("aria-pressed")).toBe("true");
  expect(mocks.error).toHaveBeenCalledWith("Try again");
  await render(
    <PollView
      postId="post"
      poll={{
        ...voted,
        total: 2,
        options: voted.options.map((option) => ({ ...option, votes: 1 })),
      }}
    />,
  );
  expect(container.textContent).toContain("2 votes");
  expect(button("Yes50%").getAttribute("aria-pressed")).toBe("true");
});

it.each([
  ["Save privately", "Unsave", "saved"],
  ["Follow replies", "Unfollow replies", "following"],
])(
  "retains confirmed %s state without refreshed parent props",
  async (enable, disable, collection) => {
    await render(<PostMenu post={post("post")} />);
    await openMenu();
    await select(enable);
    await openMenu();
    mocks.collection.mockRejectedValueOnce(new Error("Offline"));
    await select(disable);
    await openMenu();
    await select(disable);
    expect(mocks.collection.mock.calls.map((call) => call.slice(1))).toEqual([
      [collection, true],
      [collection, false],
      [collection, false],
    ]);
    await openMenu();
    expect(document.body.textContent).toContain(enable);
  },
);

it("accepts refreshed collection settings after a locally confirmed change", async () => {
  const initial = post("post");
  await render(<PostMenu post={initial} />);
  await openMenu();
  await select("Save privately");
  await render(
    <PostMenu post={{ ...initial, saved: false, following: true }} />,
  );
  await openMenu();
  expect(document.body.textContent).toContain("Save privately");
  expect(document.body.textContent).toContain("Unfollow replies");
});
