import { describe, expect, it } from "vitest";
import { countryName, inCountry } from "./countries";

describe("countries", () => {
  it("uses friendly names", () => {
    expect(countryName("KR")).toBe("South Korea");
    expect(countryName("in")).toBe("India");
  });
  it("adds an article where English needs one", () => {
    expect(inCountry("US")).toBe("the United States");
    expect(inCountry("NL")).toBe("the Netherlands");
    expect(inCountry("IN")).toBe("India");
  });
});
