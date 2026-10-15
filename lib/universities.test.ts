import { describe, expect, it } from "vitest";
import { findUniversityByEmail, slugify } from "./universities";

describe("findUniversityByEmail", () => {
  it("matches an exact university domain", () => {
    expect(findUniversityByEmail("jane@stanford.edu")?.name).toBe(
      "Stanford University",
    );
  });

  it("matches subdomains by suffix", () => {
    expect(findUniversityByEmail("jane@cs.stanford.edu")?.name).toBe(
      "Stanford University",
    );
  });

  it("prefers the longest matching suffix", () => {
    // baruch.cuny.edu and cuny.edu are different universities in the dataset.
    const baruch = findUniversityByEmail("sam@baruch.cuny.edu");
    const cuny = findUniversityByEmail("sam@cuny.edu");
    expect(baruch).not.toBeNull();
    expect(cuny).not.toBeNull();
    expect(baruch?.slug).not.toBe(cuny?.slug);
  });

  it("is case and whitespace insensitive", () => {
    expect(findUniversityByEmail("  Jane@STANFORD.EDU ")?.domain).toBe(
      "stanford.edu",
    );
  });

  it("rejects personal and malformed addresses", () => {
    for (const email of [
      "jane@gmail.com",
      "jane@outlook.com",
      "jane@edu",
      "jane@",
      "@stanford.edu",
      "jane",
      "a@b@stanford.edu",
    ]) {
      expect(findUniversityByEmail(email), email).toBeNull();
    }
  });

  it("never matches a bare public suffix", () => {
    expect(findUniversityByEmail("jane@ac.in")).toBeNull();
    expect(findUniversityByEmail("jane@edu.au")).toBeNull();
  });

  it("gives every university a unique slug", () => {
    const a = findUniversityByEmail("x@stanford.edu");
    const b = findUniversityByEmail("x@mit.edu");
    expect(a?.slug).toBe("stanford-university");
    expect(b?.slug).not.toBe(a?.slug);
  });
});

describe("slugify", () => {
  it("strips accents and punctuation", () => {
    expect(
      slugify("Universidade Comunitária da Região de Chapecó - Unochapecó"),
    ).toBe("universidade-comunitaria-da-regiao-de-chapeco-unochapeco");
  });
});
