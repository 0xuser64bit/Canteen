import { describe, expect, it } from "vitest";
import { parseDraft } from "./draft";

describe("saved drafts", () => {
  it.each([null, "broken", "null", "42", "[]"])("recovers from %s", (raw) => {
    expect(parseDraft(raw)).toEqual({ title: "", body: "" });
  });

  it("rejects non-text fields while preserving valid unsent text", () => {
    expect(parseDraft('{"title":{"text":"bad"},"body":"Keep this"}')).toEqual({
      title: "",
      body: "Keep this",
    });
    expect(parseDraft('{"title":"A question","body":42}')).toEqual({
      title: "A question",
      body: "",
    });
  });

  it("does not truncate a draft before the author can edit it", () => {
    const body = "x".repeat(20_000);
    expect(parseDraft(JSON.stringify({ title: "Question", body }))).toEqual({
      title: "Question",
      body,
    });
  });
});
