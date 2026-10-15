import { describe, expect, it } from "vitest";
import { commentInput, postInput } from "./validation";

describe("postInput", () => {
  const valid = {
    title: "Best study spots?",
    body: "Asking for finals week.",
    topic: "ACADEMICS",
    audience: "EVERYONE",
  };

  it("accepts a normal post and trims whitespace", () => {
    const parsed = postInput.parse({
      ...valid,
      title: "  Best study spots?  ",
    });
    expect(parsed.title).toBe("Best study spots?");
  });

  it("rejects whitespace-only content", () => {
    expect(postInput.safeParse({ ...valid, body: "   \n\n  " }).success).toBe(
      false,
    );
  });

  it("rejects unknown topics and audiences", () => {
    expect(postInput.safeParse({ ...valid, topic: "MEMES" }).success).toBe(
      false,
    );
    expect(postInput.safeParse({ ...valid, audience: "PUBLIC" }).success).toBe(
      false,
    );
  });

  it("collapses runs of blank lines", () => {
    expect(postInput.parse({ ...valid, body: "a\n\n\n\n\nb" }).body).toBe(
      "a\n\nb",
    );
  });
});

describe("commentInput", () => {
  it("enforces the length limit", () => {
    expect(
      commentInput.safeParse({ postId: "p", body: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});
