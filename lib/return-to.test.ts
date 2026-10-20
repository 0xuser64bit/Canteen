import { expect, it } from "vitest";
import { safeReturnTo, threadHref, threadReturnTo } from "./return-to";

it("preserves local discussion intent without allowing redirects outside product routes", () => {
  expect(safeReturnTo("/p/thread-123?reply=abc#reply-abc")).toBe(
    "/p/thread-123?reply=abc#reply-abc",
  );
  for (const input of [
    null,
    "https://evil.invalid",
    "//evil.invalid",
    "/\\evil.invalid",
    "/join?next=/join",
    "/api/auth/sign-out",
    "/%2f%2fevil.invalid",
    "/p/a\n",
  ])
    expect(safeReturnTo(input)).toBe("/campus");
});

it("returns to the exact reading filters without allowing external or nested thread destinations", () => {
  const source = "/home?topic=academics&unanswered=1&sort=oldest";
  expect(threadReturnTo(source)).toBe(source);
  expect(threadReturnTo("/me?collection=saved")).toBe("/me?collection=saved");
  for (const input of [
    "https://evil.invalid",
    "//evil.invalid",
    "/p/other?from=/p/one",
    "/new",
    null,
  ])
    expect(threadReturnTo(input)).toBe("/campus");
  const href = threadHref("/p/thread-123?reply=abc#reply-abc", source);
  const url = new URL(href, "https://canteen.invalid");
  expect(url.searchParams.get("from")).toBe(source);
  expect(url.searchParams.get("reply")).toBe("abc");
  expect(url.hash).toBe("#reply-abc");
});
