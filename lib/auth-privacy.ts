const discardedTokens = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
};

/** Provider tokens are unnecessary after Canteen verifies a sign-in. */
export function withoutProviderTokens<T extends object>(
  account: T,
): Omit<T, keyof typeof discardedTokens> & typeof discardedTokens {
  return { ...account, ...discardedTokens };
}
