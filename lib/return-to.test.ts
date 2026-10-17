import { expect, it } from "vitest";
import { safeReturnTo } from "./return-to";

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
