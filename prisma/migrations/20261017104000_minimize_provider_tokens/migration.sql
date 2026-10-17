-- Provider identity bindings remain; Canteen never calls provider APIs after sign-in.
UPDATE "Account" SET
  "accessToken" = NULL,
  "refreshToken" = NULL,
  "idToken" = NULL,
  "accessTokenExpiresAt" = NULL,
  "refreshTokenExpiresAt" = NULL;
