// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  CommentMenu,
  POST_DELETED,
  PostMenu,
  ReportDialog,
  share,
} from "@/components/post-menu";

const mocks = vi.hoisted(() => ({
  report: vi.fn(),
  deletePost: vi.fn(),
  deleteComment: vi.fn(),
  collection: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  clipboard: vi.fn(),
  nativeShare: vi.fn(),
}));
vi.mock("@/server/actions", () => ({
  reportContent: mocks.report,
  deletePost: mocks.deletePost,
  deleteComment: mocks.deleteComment,
  setCollection: mocks.collection,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/p/thread",
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.error, success: mocks.success },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.report.mockResolvedValue({ ok: true });
  mocks.deletePost.mockResolvedValue({ ok: true });
  mocks.deleteComment.mockResolvedValue({ ok: true });
  mocks.collection.mockResolvedValue({ ok: true });
  mocks.clipboard.mockResolvedValue(undefined);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(navigator.clipboard, "writeText").mockImplementation(
    mocks.clipboard,
  );
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: mocks.nativeShare,
  });
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  Reflect.deleteProperty(navigator, "share");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const render = async (node: ReactNode) => act(async () => root.render(node));
const button = (name: string) => {
  const node = [...document.querySelectorAll("button")].find(
    (node) => node.textContent?.trim() === name,
  );
  if (!node) throw new Error(`Missing button: ${name}`);
  return node;
};
const click = async (node: HTMLElement) => act(async () => node.click());
const radio = (value: string) =>
  document.querySelector<HTMLInputElement>(`input[value="${value}"]`)!;
const openMenu = async (name = "More actions") => {
  const trigger = document.querySelector<HTMLButtonElement>(
    `button[aria-label="${name}"]`,
  )!;
  await act(async () => {
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  });
};
const select = async (name: string) => {
  const item = [
    ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ].find((node) => node.textContent?.trim() === name);
  if (!item) throw new Error(`Missing menu item: ${name}`);
  await click(item);
};
function deferred() {
  let resolve!: (value: { ok: true }) => void;
  const promise = new Promise<{ ok: true }>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
const post = {
  id: "thread",
  title: "A campus question",
  isMine: false,
  saved: false,
  following: false,
};

it("keeps the selected report reason after an offline failure and allows retry", async () => {
  const close = vi.fn();
  mocks.report.mockRejectedValueOnce(new Error("Offline"));
  await render(
    <ReportDialog target="post" id="thread" open onOpenChange={close} />,
  );
  await click(radio("HARASSMENT"));
  await click(button("Send report"));
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    "Couldn't confirm your report",
  );
  expect(radio("HARASSMENT").checked).toBe(true);
  expect(close).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  await click(button("Send report"));
  expect(mocks.report).toHaveBeenNthCalledWith(2, {
    target: "post",
    id: "thread",
    reason: "HARASSMENT",
  });
  expect(close).toHaveBeenCalledWith(false);
  expect(mocks.success).toHaveBeenCalledOnce();
});

it("uses one native radio group and prevents duplicate reports while sending", async () => {
  const request = deferred();
  const close = vi.fn();
  mocks.report.mockReturnValueOnce(request.promise);
  await render(
    <ReportDialog target="comment" id="reply" open onOpenChange={close} />,
  );
  const reasons = [
    ...document.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  ];
  expect(reasons).toHaveLength(6);
  expect(new Set(reasons.map((input) => input.name)).size).toBe(1);
  await click(radio("SPAM"));
  await click(radio("OTHER"));
  expect(
    reasons.filter((input) => input.checked).map((input) => input.value),
  ).toEqual(["OTHER"]);
  const send = button("Send report");
  await act(async () => {
    send.click();
    send.click();
  });
  expect(mocks.report).toHaveBeenCalledOnce();
  expect(document.querySelector("fieldset")?.disabled).toBe(true);
  expect(button("Cancel").disabled).toBe(true);
  await click(button("Close"));
  expect(close).not.toHaveBeenCalled();
  await act(async () => request.resolve({ ok: true }));
  expect(close).toHaveBeenCalledWith(false);
});

it("keeps deletion open after a transport failure and only removes the post after retry", async () => {
  const deleted = vi.fn();
  window.addEventListener(POST_DELETED, deleted);
  mocks.deletePost.mockRejectedValueOnce(new Error("Offline"));
  try {
    await render(<PostMenu post={{ ...post, isMine: true }} />);
    await openMenu();
    await select("Delete post");
    await click(button("Delete"));
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't confirm deletion",
    );
    expect(document.body.textContent).toContain("Delete this post?");
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(deleted).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    await click(button("Delete"));
    expect(mocks.deletePost).toHaveBeenCalledTimes(2);
    expect(mocks.replace).toHaveBeenCalledWith("/campus");
    expect(deleted).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    window.removeEventListener(POST_DELETED, deleted);
  }
});

it("keeps a rejected reply deletion available to retry", async () => {
  mocks.deleteComment.mockResolvedValueOnce({
    ok: false,
    error: "Please try again.",
  });
  await render(<CommentMenu id="reply" isMine />);
  await openMenu("Reply actions");
  await select("Delete reply");
  await click(button("Delete"));
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(
    "Please try again.",
  );
  expect(document.body.textContent).toContain("Delete this reply?");
  await click(button("Delete"));
  expect(mocks.deleteComment).toHaveBeenCalledTimes(2);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it.each([
  ["Save privately", "saved", "Saved privately"],
  ["Follow replies", "following", "You'll get reply alerts"],
])("recovers from an offline %s action", async (label, collection, success) => {
  mocks.collection.mockRejectedValueOnce(new Error("Offline"));
  await render(<PostMenu post={post} />);
  await openMenu();
  await select(label);
  expect(mocks.error).toHaveBeenCalledWith(
    "Couldn't confirm that change. Check your connection and try again.",
  );
  expect(mocks.success).not.toHaveBeenCalled();
  await openMenu();
  await select(label);
  expect(mocks.collection).toHaveBeenNthCalledWith(
    2,
    "thread",
    collection,
    true,
  );
  expect(mocks.success).toHaveBeenCalledWith(success);
});

it("respects share-sheet cancellation without copying", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  mocks.nativeShare.mockRejectedValueOnce(
    new DOMException("Cancelled", "AbortError"),
  );
  await share("/p/thread", "A campus question");
  expect(mocks.nativeShare).toHaveBeenCalledOnce();
  expect(mocks.clipboard).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.error).not.toHaveBeenCalled();
});

it("falls back to copying when native sharing is unavailable", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  mocks.nativeShare.mockRejectedValueOnce(new Error("Unavailable"));
  await share("/p/thread", "A campus question");
  expect(mocks.clipboard).toHaveBeenCalledWith(
    new URL("/p/thread", window.location.origin).toString(),
  );
  expect(mocks.success).toHaveBeenCalledWith("Link copied");
});

it("explains clipboard failures without claiming the link was copied", async () => {
  mocks.clipboard.mockRejectedValueOnce(new Error("Permission denied"));
  await expect(
    share("/p/thread", "A campus question"),
  ).resolves.toBeUndefined();
  expect(mocks.error).toHaveBeenCalledWith(
    "Couldn't copy the link. Try sharing it from your browser.",
  );
  expect(mocks.success).not.toHaveBeenCalled();
});
