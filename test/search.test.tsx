// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { openSearch, SearchPalette } from "@/components/search";
import type { SearchResults } from "@/server/queries";

const mocks = vi.hoisted(() => ({ search: vi.fn(), push: vi.fn() }));
vi.mock("@/server/actions", () => ({ searchCanteen: mocks.search }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  vi.clearAllMocks();
  history.replaceState(null, "", "/campus");
  vi.useFakeTimers();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<SearchPalette />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const open = async () => act(async () => openSearch());
const close = async () =>
  act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );
  });
const input = () => {
  const node = document.querySelector<HTMLInputElement>(
    'input[placeholder="Search posts and universities"]',
  );
  if (!node) throw new Error("Missing search input");
  return node;
};
const change = async (value: string) =>
  act(async () => {
    const node = input();
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  });
const debounce = async () => act(async () => vi.advanceTimersByTime(180));
function deferred() {
  let resolve!: (value: SearchResults) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<SearchResults>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const result = (title: string): SearchResults => ({
  posts: [{ id: title, title, topic: "GENERAL" }],
  universities: [],
});

it("retains the query after a failed search and retries successfully", async () => {
  mocks.search.mockRejectedValueOnce(new Error("Offline"));
  await open();
  await change("scholarships");
  await debounce();
  expect(document.body.textContent).toContain("Search couldn't load");
  expect(input().value).toBe("scholarships");
  mocks.search.mockResolvedValueOnce(result("A scholarship"));
  const retry = [...document.querySelectorAll("button")].find(
    (node) => node.textContent === "Retry",
  )!;
  await act(async () => retry.click());
  await debounce();
  expect(mocks.search).toHaveBeenNthCalledWith(2, "scholarships");
  expect(document.body.textContent).toContain("A scholarship");
  expect(document.body.textContent).not.toContain("Search couldn't load");
});

it("does not fetch a queued search after the palette closes", async () => {
  await open();
  await change("campus");
  await close();
  await debounce();
  expect(mocks.search).not.toHaveBeenCalled();
});

it("ignores older results and failures after the query changes", async () => {
  const old = deferred();
  const current = deferred();
  mocks.search
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(current.promise);
  await open();
  await change("campus");
  await debounce();
  await change("careers");
  await debounce();
  await act(async () => current.resolve(result("Current results")));
  await act(async () => old.reject(new Error("Old failure")));
  expect(document.body.textContent).toContain("Current results");
  expect(document.body.textContent).not.toContain("Search couldn't load");
});

it("ignores results after deleting the query, including when searching it again", async () => {
  const old = deferred();
  const current = deferred();
  mocks.search
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(current.promise);
  await open();
  await change("campus");
  await debounce();
  await change("");
  await act(async () => old.resolve(result("Stale result")));
  await change("campus");
  expect(document.body.textContent).not.toContain("Stale result");
  await debounce();
  await act(async () => current.resolve(result("Fresh result")));
  expect(document.body.textContent).toContain("Fresh result");
});

it("ignores a request that finishes after closing and reopening search", async () => {
  const old = deferred();
  const current = deferred();
  mocks.search
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(current.promise);
  await open();
  await change("campus");
  await debounce();
  await close();
  await open();
  await debounce();
  await act(async () => old.resolve(result("Closed search result")));
  expect(document.body.textContent).not.toContain("Closed search result");
  await act(async () => current.resolve(result("Reopened search result")));
  expect(document.body.textContent).toContain("Reopened search result");
});

it("returns from a search result to the current reading filters", async () => {
  history.replaceState(null, "", "/home?topic=careers&unanswered=1");
  mocks.search.mockResolvedValueOnce(result("question"));
  await open();
  await change("campus");
  await debounce();
  await act(async () =>
    document.querySelector<HTMLElement>("[cmdk-item]")!.click(),
  );
  expect(mocks.push).toHaveBeenCalledWith(
    "/p/question?from=%2Fhome%3Ftopic%3Dcareers%26unanswered%3D1",
  );
});

it("keeps the original reading context when searching from another thread", async () => {
  history.replaceState(null, "", "/p/first?from=%2Fme%3Fcollection%3Dsaved");
  mocks.search.mockResolvedValueOnce(result("question"));
  await open();
  await change("campus");
  await debounce();
  await act(async () =>
    document.querySelector<HTMLElement>("[cmdk-item]")!.click(),
  );
  expect(mocks.push).toHaveBeenCalledWith(
    "/p/question?from=%2Fme%3Fcollection%3Dsaved",
  );
});
