import { expect, it } from "vitest";
import { withoutProviderTokens } from "./auth-privacy";

it("drops provider credentials and embedded profiles while preserving account binding", () => {
  const account = {
    providerId: "google",
    accountId: "provider-subject",
    userId: "student",
    idToken: "profile-bearing-jwt",
    accessToken: "access",
    refreshToken: "refresh",
  };
  const scrubbed = withoutProviderTokens(account);
  expect(scrubbed).toMatchObject({
    providerId: "google",
    accountId: "provider-subject",
    userId: "student",
    idToken: null,
    accessToken: null,
    refreshToken: null,
  });
  expect(account.idToken).toBe("profile-bearing-jwt");
  expect(
    withoutProviderTokens({ idToken: "returning-sign-in" }).idToken,
  ).toBeNull();
});
