// @vitest-environment happy-dom
import { act, StrictMode, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NotificationList } from "@/components/notifications";
import type { NotificationItem } from "@/server/queries";

const mocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  router: { refresh: vi.fn() },
}));
vi.mock("@/server/actions", () => ({
  markNotificationsRead: mocks.acknowledge,
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/components/thread-link", () => ({
  ThreadLink: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/components/time", () => ({ TimeAgo: () => <span>just now</span> }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
let mounted: boolean;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.acknowledge.mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  mounted = true;
});
afterEach(async () => {
  if (mounted) await act(async () => root.unmount());
  container.remove();
});
const item = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: "notification-one",
  type: "COMMENT",
  unread: true,
  createdAt: new Date("2026-10-20T10:00:00Z"),
  revision: 0,
  replyId: "reply-one",
  post: {
    id: "post-one",
    title: "Finding a quiet study spot",
    mine: true,
    question: false,
  },
  ...overrides,
});
const render = async (items: NotificationItem[], key = "latest") =>
  act(async () =>
    root.render(
      <StrictMode>
        <NotificationList key={key} items={items} />
      </StrictMode>,
    ),
  );
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it("keeps arrival grouping after server read status refreshes and acknowledges exact versions once", async () => {
  const fresh = item();
  const earlier = item({
    id: "earlier",
    unread: false,
    type: "LIKE",
    replyId: null,
    post: {
      id: "earlier-post",
      title: "A useful conversation",
      mine: true,
      question: false,
    },
  });
  await render([fresh, earlier]);
  expect(mocks.acknowledge).toHaveBeenCalledExactlyOnceWith([
    { id: fresh.id, revision: 0 },
  ]);
  expect(mocks.router.refresh).toHaveBeenCalledOnce();
  await render([{ ...fresh, unread: false }, earlier]);
  expect(
    container.querySelector('[aria-label="New notifications"]')!.textContent,
  ).toContain(fresh.post.title);
  expect(
    container.querySelector('[aria-label="Earlier notifications"]')!
      .textContent,
  ).toContain(earlier.post.title);
  expect(
    container.querySelector('[aria-label="New on arrival"]'),
  ).not.toBeNull();
  expect(container.querySelector("a")!.getAttribute("href")).toBe(
    "/p/post-one?reply=reply-one#reply-reply-one",
  );
  expect(mocks.acknowledge).toHaveBeenCalledOnce();
});

it("starts read notifications under Earlier on a new visit", async () => {
  await render([item()]);
  await render([item({ unread: false })], "another-visit");
  expect(
    container.querySelector('[aria-label="New notifications"]'),
  ).toBeNull();
  expect(
    container.querySelector('[aria-label="Earlier notifications"]')!
      .textContent,
  ).toContain("Finding a quiet study spot");
});

it("keeps notifications available after a failed acknowledgement and retries only on request", async () => {
  mocks.acknowledge.mockRejectedValueOnce(new Error("Offline"));
  await render([item()]);
  expect(container.querySelector('[role="status"]')!.textContent).toContain(
    "Couldn't update read status",
  );
  expect(container.textContent).toContain("Finding a quiet study spot");
  await render([item()]);
  expect(mocks.acknowledge).toHaveBeenCalledOnce();
  await act(async () =>
    container.querySelector<HTMLButtonElement>("button")!.click(),
  );
  expect(mocks.acknowledge).toHaveBeenNthCalledWith(2, [
    { id: "notification-one", revision: 0 },
  ]);
  expect(container.querySelector('[role="status"]')).toBeNull();
  expect(mocks.router.refresh).toHaveBeenCalledOnce();
});

it("acknowledges a newer delivered revision without confusing it with the previous attempt", async () => {
  const first = deferred();
  const second = deferred();
  mocks.acknowledge
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  await render([item()]);
  await render([item({ revision: 1 })]);
  expect(mocks.acknowledge.mock.calls).toEqual([
    [[{ id: "notification-one", revision: 0 }]],
    [[{ id: "notification-one", revision: 1 }]],
  ]);
  await act(async () => {
    second.reject(new Error("Offline"));
    first.resolve();
  });
  expect(container.querySelector('[role="status"]')).not.toBeNull();
  await act(async () =>
    container.querySelector<HTMLButtonElement>("button")!.click(),
  );
  expect(mocks.acknowledge).toHaveBeenLastCalledWith([
    { id: "notification-one", revision: 1 },
  ]);
});

it("stops offering to retry an obsolete failed revision", async () => {
  mocks.acknowledge.mockRejectedValueOnce(new Error("Offline"));
  await render([item()]);
  expect(container.querySelector('[role="status"]')).not.toBeNull();
  await render([item({ revision: 1 })]);
  expect(container.querySelector('[role="status"]')).toBeNull();
  expect(container.querySelector("button")).toBeNull();
  expect(mocks.acknowledge).toHaveBeenLastCalledWith([
    { id: "notification-one", revision: 1 },
  ]);
});

it("does not refresh another page when acknowledgement finishes after leaving", async () => {
  const request = deferred();
  mocks.acknowledge.mockReturnValue(request.promise);
  await render([item()]);
  await act(async () => root.unmount());
  mounted = false;
  await act(async () => request.resolve());
  expect(mocks.router.refresh).not.toHaveBeenCalled();
});

it("says what happened in each alert without naming anyone", async () => {
  const thread = (mine: boolean, question: boolean) => ({
    id: `post-${mine}-${question}`,
    title: "A thread",
    mine,
    question,
  });
  await render([
    item({ id: "asked", post: thread(true, true) }),
    item({ id: "posted", post: thread(true, false) }),
    item({ id: "joined", post: thread(false, true) }),
    item({ id: "liked", type: "LIKE", replyId: null }),
    item({ id: "helped", type: "HELPFUL", post: thread(false, true) }),
  ]);
  const labels = [...container.querySelectorAll("li")].map((li) =>
    li.textContent!.replace(/^A thread|^Finding a quiet study spot/, ""),
  );
  expect(labels).toEqual([
    "New replies to your question·just now",
    "New replies to your post·just now",
    "New replies in a thread you follow·just now",
    "New likes on your post·just now",
    "The author marked your reply helpful·just now",
  ]);
});
