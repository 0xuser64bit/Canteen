import { afterEach, expect, it, vi } from "vitest";
import { campusHostDomains } from "./campus-hosts";
afterEach(() => vi.unstubAllEnvs());

it("requires both current staff eligibility and an explicit bounded campus assignment", () => {
  vi.stubEnv("TEAM_EMAILS", "host@example.org");
  vi.stubEnv(
    "CAMPUS_HOSTS",
    JSON.stringify({
      "HOST@example.org": [
        "Stanford.edu",
        "mit.edu",
        "mit.edu",
        "https://evil.invalid",
        "*",
      ],
    }),
  );
  expect(campusHostDomains("host@example.org")).toEqual([
    "stanford.edu",
    "mit.edu",
  ]);
  expect(campusHostDomains("other@example.org")).toEqual([]);
  vi.stubEnv("TEAM_EMAILS", "");
  expect(campusHostDomains("host@example.org")).toEqual([]);
  vi.stubEnv("TEAM_EMAILS", "host@example.org");
  vi.stubEnv("CAMPUS_HOSTS", "broken");
  expect(campusHostDomains("host@example.org")).toEqual([]);
});
