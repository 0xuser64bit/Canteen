import { expect, it } from "vitest";
import { universityRequestInput } from "./university-request";
it("accepts domain-only requests and a safe homepage without collecting personal details", () => {
  expect(
    universityRequestInput.parse({
      domain: " University.edu ",
      website: "https://www.university.edu/",
    }),
  ).toEqual({
    domain: "university.edu",
    website: "https://www.university.edu",
  });
  for (const input of [
    { domain: "university.edu", website: "https://[malformed" },
    { domain: "student@university.edu", website: "https://university.edu" },
    { domain: "university.edu", website: "http://university.edu" },
    {
      domain: "university.edu",
      website: "https://user:password@university.edu",
    },
    {
      domain: "university.edu",
      website: "https://university.edu/?email=student@example.org",
    },
  ])
    expect(universityRequestInput.safeParse(input).success).toBe(false);
});
