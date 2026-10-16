import { describe, expect, it } from "vitest";
import {
  CONTACT_INFO_MESSAGE,
  commentInput,
  hasContactInfo,
  postInput,
} from "./validation";

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

  it("requires a safe application link and future deadline for opportunities", () => {
    const opportunity = {
      ...valid,
      topic: "OPPORTUNITIES",
      applicationUrl: "https://example.org/apply",
      deadline: new Date(Date.now() + 86400000).toISOString(),
    };
    expect(postInput.safeParse(opportunity).success).toBe(true);
    for (const applicationUrl of [
      "javascript:alert(1)",
      "http://example.org",
      "https://user:secret@example.org",
      undefined,
    ])
      expect(
        postInput.safeParse({ ...opportunity, applicationUrl }).success,
      ).toBe(false);
    expect(
      postInput.safeParse({ ...opportunity, deadline: "2020-01-01T00:00:00Z" })
        .success,
    ).toBe(false);
    expect(
      postInput.safeParse({ ...opportunity, deadline: undefined }).success,
    ).toBe(false);
    expect(
      postInput.safeParse({ ...opportunity, topic: "GENERAL" }).success,
    ).toBe(false);
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

describe("postInput polls", () => {
  const poll = {
    title: "Best dining hall?",
    body: "",
    topic: "CAMPUS_LIFE",
    audience: "EVERYONE",
  };

  it("lets a poll stand on its question, trimming its choices", () => {
    const parsed = postInput.parse({ ...poll, poll: [" North ", "South"] });
    expect(parsed.poll).toEqual(["North", "South"]);
    expect(parsed.body).toBe("");
  });

  it("still needs a body without a poll", () => {
    expect(postInput.safeParse(poll).success).toBe(false);
  });

  it.each([
    [["Only one"]],
    [["A", "B", "C", "D", "E"]],
    [["Same", "same"]],
    [["A", "  "]],
    [["Text me", "415-555-0132"]],
  ])("rejects choices %j", (choices) => {
    expect(postInput.safeParse({ ...poll, poll: choices }).success).toBe(false);
  });
});

describe("commentInput", () => {
  it("enforces the length limit", () => {
    expect(
      commentInput.safeParse({ postId: "p", body: "x".repeat(2001) }).success,
    ).toBe(false);
  });

  it("rejects contact details", () => {
    const reply = commentInput.safeParse({
      postId: "p",
      body: "text her at 415-555-0132",
    });
    expect(reply.success).toBe(false);
    expect(reply.error?.issues[0]?.message).toBe(CONTACT_INFO_MESSAGE);
  });
});

describe("hasContactInfo", () => {
  it.each([
    "mail me at jane.doe@stanford.edu",
    "his number is (415) 555-0132",
    "call 415.555.0132",
    "+91 98765 43210 is her number",
    "9876543210",
    "UK: +44 7700 900123",
  ])("flags %s", (value) => {
    expect(hasContactInfo(value)).toBe(true);
  });

  it.each([
    "Is CS 106B worth taking in 2026?",
    "Rent went from $1,200 to $1,450 a month",
    "Deadline: 31.10.2026 23:59",
    "Exam on 2026-10-15 10:30 in room 204",
    "Apply here: https://www.linkedin.com/jobs/view/3912345678/",
    "Classes run 9-5, Monday to Friday",
    "Read https://medium.com/@someone/notes-1234567890",
  ])("leaves %s alone", (value) => {
    expect(hasContactInfo(value)).toBe(false);
  });
});
