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

  it("recovers audience, opportunity, poll and retry context without trusting invalid enums", () => {
    const draft = {
      title: "An opportunity",
      body: "Details",
      kind: "DISCUSSION",
      topic: "OPPORTUNITIES",
      audience: "EVERYONE",
      applicationUrl: "https://example.org/apply",
      deadline: "2030-01-02T12:30",
      poll: ["Yes", "No"],
      submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      imageAlt: "Application details",
    };
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
    expect(
      parseDraft(
        JSON.stringify({
          title: "Q",
          body: "B",
          audience: "ALL",
          kind: {},
          topic: "FAKE",
          poll: [42],
          submissionId: "bad",
        }),
      ),
    ).toEqual({ title: "Q", body: "B" });
  });
});
