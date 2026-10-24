// @vitest-environment happy-dom
import { act, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CampusPage from "@/app/(app)/campus/page";
import HomePage from "@/app/(app)/home/page";
import { Feed } from "@/components/feed";
import { FeedControls, TopicChips } from "@/components/page-header";
import type { PostSummary } from "@/server/queries";

const mocks = vi.hoisted(() => ({
  loadMore: vi.fn(),
  getFeed: vi.fn(),
  members: 6,
  visible: [] as (() => void)[],
}));

vi.mock("@/server/actions", () => ({ loadMore: mocks.loadMore }));
vi.mock("@/server/queries", () => ({
  getFeed: mocks.getFeed,
  getCampusSize: async () => mocks.members,
  getUniversityPage: async () => ({ memberCount: mocks.members }),
  MIN_MEMBERS_TO_NAME_UNIVERSITY: 5,
}));
vi.mock("@/lib/session", () => ({
  requireViewer: async () => ({
    university: { name: "Example University", slug: "example" },
  }),
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
vi.mock("next/link", () => ({
  default: ({ children, href, className }: ComponentProps<"a">) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/search-button", () => ({ SearchButton: () => null }));
vi.mock("@/components/post", () => ({
  PostCard: ({ post }: { post: PostSummary }) => (
    <article>{post.title}</article>
  ),
}));
vi.mock("@/components/post-menu", () => ({
  POST_DELETED: "test:post-deleted",
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.members = 6;
  mocks.visible = [];
  mocks.getFeed.mockResolvedValue({ items: [], nextCursor: null });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        mocks.visible.push(() => callback([{ isIntersecting: true }]));
      }
      observe() {}
      disconnect() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
const render = async (element: ReactNode) =>
  act(async () => root.render(element));
const href = (label: string) => {
  const link = [...container.querySelectorAll("a")].find(
    (item) => item.textContent === label,
  );
  if (!link) throw new Error(`Missing link: ${label}`);
  return new URL(link.getAttribute("href")!, "https://canteen.test");
};
const post = (id: string): PostSummary => ({
  id,
  title: `Post ${id}`,
  excerpt: "Some context",
  image: null,
  applicationUrl: null,
  deadline: null,
  closed: false,
  kind: "QUESTION",
  helpfulCommentId: null,
  topic: "GENERAL",
  audience: "EVERYONE",
  createdAt: new Date(),
  editedAt: null,
  university: { name: "Example University", slug: null },
  alias: { name: "Quiet Otter", hue: 120 },
  isMine: false,
  liked: false,
  likeCount: 0,
  commentCount: 0,
  viewCount: 0,
  hidden: false,
  revision: 0,
  saved: false,
  following: false,
  staff: false,
  poll: null,
});

describe("feed recovery", () => {
  it.each(["returned", "network"])(
    "keeps loaded posts after a %s failure and retries only on request",
    async (failure) => {
      if (failure === "network")
        mocks.loadMore.mockRejectedValueOnce(new Error("Offline"));
      else
        mocks.loadMore.mockResolvedValueOnce({
          ok: false,
          error: "Please try again.",
        });
      await render(
        <Feed
          initial={{ items: [post("one")], nextCursor: "next-page" }}
          scope="campus"
          empty={<p>Empty feed</p>}
        />,
      );
      const visible = mocks.visible[0]!;
      await act(async () => visible());
      expect(container.textContent).toContain("Post one");
      expect(container.querySelector('[role="status"]')).not.toBeNull();
      expect(container.querySelector("button")!.textContent).toBe("Retry");
      await act(async () => visible());
      expect(mocks.loadMore).toHaveBeenCalledOnce();
      mocks.loadMore.mockResolvedValueOnce({
        ok: true,
        data: { items: [post("two")], nextCursor: null },
      });
      await act(async () => container.querySelector("button")!.click());
      expect(mocks.loadMore).toHaveBeenLastCalledWith(
        expect.objectContaining({ cursor: "next-page" }),
      );
      expect(container.textContent).toContain("Post one");
      expect(container.textContent).toContain("Post two");
      expect(container.querySelector('[role="status"]')).toBeNull();
    },
  );

  it("starts only one pagination request before the pending render", async () => {
    let complete!: (value: unknown) => void;
    mocks.loadMore.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    await render(
      <Feed
        initial={{ items: [post("one")], nextCursor: "next-page" }}
        scope="campus"
        empty={null}
      />,
    );
    await act(async () => {
      mocks.visible[0]!();
      mocks.visible[0]!();
    });
    expect(mocks.loadMore).toHaveBeenCalledOnce();
    await act(async () =>
      complete({ ok: true, data: { items: [], nextCursor: null } }),
    );
  });
});

describe("feed filters", () => {
  it("omits a redundant order row but keeps question and opportunity choices", async () => {
    await render(<FeedControls base="/home" sort="newest" />);
    expect(container.querySelector('[aria-label="Feed order"]')).toBeNull();
    await render(
      <FeedControls base="/home" sort="oldest" unanswered noReplies />,
    );
    expect(href("Latest").searchParams.get("unanswered")).toBe("1");
    expect(href("Latest").searchParams.get("noReplies")).toBe("1");
    expect(href("Oldest waiting").searchParams.get("sort")).toBe("oldest");
    expect(href("No replies yet").searchParams.has("noReplies")).toBe(false);
    await render(
      <FeedControls base="/home" topic="opportunities" sort="newest" />,
    );
    expect(href("Closing soon").searchParams.get("sort")).toBe("closing");
  });

  it("keeps a directly linked no-replies filter visible and removable", async () => {
    await render(<FeedControls base="/home" sort="newest" noReplies />);
    expect(href("No replies yet").searchParams.has("noReplies")).toBe(false);
  });

  it("puts a first-question action before the small-campus invitation", async () => {
    mocks.members = 1;
    await render(
      await CampusPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    );
    const ask = container.querySelector<HTMLAnchorElement>('a[href="/new"]');
    expect(ask?.textContent).toContain("Start a thread");
    const invite = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Invite classmates"),
    );
    expect(invite).toBeDefined();
    expect(
      ask!.compareDocumentPosition(invite!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.textContent).toContain(
      "what you share can still make you recognizable",
    );
  });

  it("keeps a populated small campus focused on posts with a compact invitation", async () => {
    mocks.members = 2;
    mocks.getFeed.mockResolvedValue({ items: [post("one")], nextCursor: null });
    await render(
      await CampusPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(container.textContent).toContain("Post one");
    expect(
      [...container.querySelectorAll("button")].some((button) =>
        button.textContent?.includes("Invite"),
      ),
    ).toBe(true);
    expect(container.textContent).not.toContain("Until 5 students");
    expect(
      container.querySelector('[aria-label="Hide for now"]'),
    ).not.toBeNull();
  });

  it("keeps the question queue when changing topics and clears it for opportunities", async () => {
    await render(
      <TopicChips
        base="/campus"
        active="general"
        unanswered
        noReplies
        sort="oldest"
      />,
    );
    const academics = href("Academics").searchParams;
    expect(Object.fromEntries(academics)).toEqual({
      topic: "academics",
      unanswered: "1",
      noReplies: "1",
      sort: "oldest",
    });
    expect(href("All").searchParams.get("noReplies")).toBe("1");
    expect(Object.fromEntries(href("Opportunities").searchParams)).toEqual({
      topic: "opportunities",
    });
  });

  it("keeps closing order only on opportunities", async () => {
    await render(
      <TopicChips base="/home" active="opportunities" sort="closing" />,
    );
    expect(href("Opportunities").searchParams.get("sort")).toBe("closing");
    expect(href("Academics").searchParams.has("sort")).toBe(false);
    expect(href("All").search).toBe("");
  });

  it.each([CampusPage, HomePage])(
    "honors Latest in the question queue",
    async (Page) => {
      await render(
        await Page({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({ unanswered: "1", sort: "newest" }),
        }),
      );
      expect(mocks.getFeed).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ unanswered: true, sort: "newest" }),
      );
    },
  );

  it.each([
    [CampusPage, "/campus"],
    [HomePage, "/home"],
  ] as const)(
    "describes an empty first-reply queue accurately and offers clear filters (%s)",
    async (Page, base) => {
      await render(
        await Page({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({
            unanswered: "1",
            noReplies: "1",
            topic: "academics",
          }),
        }),
      );
      expect(container.querySelector("h2")!.textContent).toBe(
        "No questions without replies",
      );
      expect(container.textContent).toContain(
        "waiting for their first reply right now",
      );
      expect(container.textContent).not.toContain(
        "Every question here has a helpful reply",
      );
      expect(href("Clear filters").pathname).toBe(base);
      expect(href("Clear filters").search).toBe("");
    },
  );

  it.each([CampusPage, HomePage])(
    "avoids incompatible question filters on opportunities",
    async (Page) => {
      await render(
        await Page({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({
            topic: "opportunities",
            unanswered: "1",
            noReplies: "1",
            sort: "closing",
          }),
        }),
      );
      expect(mocks.getFeed).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          unanswered: false,
          noReplies: false,
          sort: "closing",
        }),
      );
      expect(container.querySelector('[aria-label="Questions"]')).toBeNull();
      expect(container.querySelector("h2")!.textContent).toBe(
        "No open opportunities",
      );
    },
  );
});
