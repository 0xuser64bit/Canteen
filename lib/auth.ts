import "server-only";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { db } from "@/lib/db";
import { sendSignInCode } from "@/lib/email";
import { withoutProviderTokens } from "@/lib/auth-privacy";
import { keyedHash, suspendedEmailKey } from "@/lib/pseudonym";
import { LIMITS } from "@/lib/validation";
import {
  isTeamEmail,
  TEAM,
  universityForSignIn,
  type UniversityMatch,
} from "@/lib/universities";

const UNIVERSITY_EMAIL_REQUIRED = {
  code: "UNIVERSITY_EMAIL_REQUIRED",
  message:
    "That doesn't look like a university email. Use the address your university gave you.",
};

const EMAIL_DELIVERY_FAILED = {
  code: "EMAIL_DELIVERY_FAILED",
  message: "We couldn't send the email just now. Try again in a minute.",
};

const RESEND_COOLDOWN_MS = 30_000;

// Where Better Auth's email-otp plugin stores a sign-in code for an address.
const codeIdentifier = (email: string) => `sign-in-otp-${email}`;

// Hourly budgets. Each code allows five guesses, and lockouts or new IP
// addresses used to reset that; these bound guessing for an address and campus.
const SIGN_IN_BUDGET = {
  codesPerAddress: 5,
  codesPerCampus: 300,
  triesPerAddress: 10,
  triesPerCampus: 300,
};

const SIGN_IN_LIMIT = {
  code: "SIGN_IN_LIMIT",
  message: "Too many sign-in attempts for now. Try again in an hour.",
};

/** Spends one attempt from an hourly budget; false once it's used up. */
async function spend(key: string, limit: number) {
  const now = new Date();
  const lapsed = new Date(now.getTime() - 60 * 60_000);
  const [budget] = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "SignInBudget" ("key", "count", "windowStart") VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "SignInBudget"."windowStart" <= ${lapsed} THEN 1 ELSE "SignInBudget"."count" + 1 END,
      "windowStart" = CASE WHEN "SignInBudget"."windowStart" <= ${lapsed} THEN ${now} ELSE "SignInBudget"."windowStart" END
    RETURNING "count"
  `;
  return budget !== undefined && budget.count <= limit;
}

function baseURL(): BetterAuthOptions["baseURL"] {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "production") {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // A preview answers on its own deployment and branch aliases. "*.vercel.app"
  // would also trust every other Vercel site as an origin and redirect target.
  const previewHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
  ].filter((host): host is string => Boolean(host));
  if (process.env.VERCEL_ENV === "preview" && previewHosts.length > 0) {
    return { allowedHosts: previewHosts, protocol: "https" };
  }
  return "http://localhost:3000";
}

// Development prints codes to the console, so email sign-in always works locally.
export const isEmailEnabled =
  Boolean(process.env.RESEND_API_KEY) || process.env.NODE_ENV !== "production";

// Creates the university row the first time someone from it signs up.
async function ensureUniversity(match: UniversityMatch) {
  // shortcut: reused slugs make a new domain's sign-up fail; rename the slug on dataset updates.
  await db.university.createMany({ data: [match], skipDuplicates: true });
  return db.university.findUniqueOrThrow({ where: { domain: match.domain } });
}

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          // No `hd` restriction: team members sign in with personal Gmail. Students
          // still need a verified university address (validateUserInfo below).
          prompt: "select_account" as const,
          disableDefaultScope: true,
          scope: ["openid", "email"],
          // Canteen never stores real names or photos.
          mapProfileToUser: () => ({ name: "", image: undefined }),
        },
      }
    : undefined;

export const auth = betterAuth({
  appName: "Canteen",
  baseURL: baseURL(),
  database: prismaAdapter(db, { provider: "postgresql" }),
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  user: {
    additionalFields: {
      // Always set by the create hook below; never accepted from the client.
      universityId: { type: "string", required: false, input: false },
    },
    // Runs on every sign-up and Google sign-in. Removing someone from
    // TEAM_EMAILS also ends their open sessions (lib/session.ts).
    validateUserInfo: async ({ user }) => {
      if (
        !user.email ||
        !user.emailVerified ||
        !universityForSignIn(user.email)
      ) {
        return {
          error: UNIVERSITY_EMAIL_REQUIRED.code,
          errorDescription: UNIVERSITY_EMAIL_REQUIRED.message,
        };
      }
      const suspended = await db.suspendedEmail.findFirst({
        where: {
          hash: suspendedEmailKey(user.email),
          expiresAt: { gt: new Date() },
        },
        select: { hash: true },
      });
      if (suspended)
        return {
          error: "ACCOUNT_SUSPENDED",
          errorDescription:
            "This email belongs to a suspended account that was deleted. It can't rejoin yet.",
        };
    },
  },
  databaseHooks: {
    account: {
      create: {
        before: async (account) => ({ data: withoutProviderTokens(account) }),
      },
      update: {
        before: async (account) => ({ data: withoutProviderTokens(account) }),
      },
    },
    user: {
      create: {
        before: async (user) => {
          const match = universityForSignIn(user.email);
          if (!match)
            throw APIError.from("FORBIDDEN", UNIVERSITY_EMAIL_REQUIRED);
          const university = await ensureUniversity(match);
          return {
            data: { name: "", image: null, universityId: university.id },
          };
        },
      },
    },
    session: {
      create: {
        // Verified suspended students may sign in only to appeal or erase their account.
        before: async (session) => {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: {
              bannedAt: true,
              email: true,
              emailVerified: true,
              university: { select: { slug: true } },
            },
          });
          // Existing-account OTP sign-ins don't run validateUserInfo.
          if (
            !user?.emailVerified ||
            !universityForSignIn(user.email) ||
            (user.university.slug === TEAM.slug && !isTeamEmail(user.email))
          )
            throw APIError.from("FORBIDDEN", UNIVERSITY_EMAIL_REQUIRED);
          // Rate limits read the live request; a session keeps no network
          // address or device description next to the account.
          return { data: { ipAddress: null, userAgent: null } };
        },
      },
    },
  },
  socialProviders: google,
  // Failed sign-ins (e.g. a non-university Google account) land back on /join?error=...
  onAPIError: { errorURL: "/join" },
  // Endpoints Canteen doesn't use: passwords, profile edits, provider tokens.
  disabledPaths: [
    "/delete-user", // account deletion is a Canteen action that also removes images
    "/sign-up/email",
    "/sign-in/email",
    "/update-user",
    "/change-email",
    "/change-password",
    "/request-password-reset",
    "/reset-password",
    "/set-password",
    "/send-verification-email",
    "/verify-email",
    "/verify-password",
    "/link-social",
    "/unlink-account",
    "/list-accounts",
    "/account-info",
    "/get-access-token",
    "/refresh-token",
    "/email-otp/check-verification-otp",
    "/email-otp/verify-email",
    "/email-otp/request-password-reset",
    "/forget-password/email-otp",
    "/email-otp/reset-password",
    "/email-otp/request-email-change",
    "/email-otp/change-email",
    // Better Auth stores a code before it tries to send it. Without a provider
    // nobody receives the code, but it could still be guessed.
    ...(isEmailEnabled
      ? []
      : ["/email-otp/send-verification-otp", "/sign-in/email-otp"]),
  ],
  rateLimit: {
    storage: "database",
    customRules: {
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/sign-in/email-otp": { window: 60, max: 5 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (
        ctx.path !== "/email-otp/send-verification-otp" &&
        ctx.path !== "/sign-in/email-otp"
      )
        return;

      const body = ctx.body as { email?: unknown; type?: unknown } | undefined;
      const email =
        typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      const university = universityForSignIn(email);
      const address = keyedHash(`sign-in:${email}`);

      if (ctx.path === "/sign-in/email-otp") {
        // The address budget goes first, so one address can't drain its campus.
        if (
          !(await spend(`try:${address}`, SIGN_IN_BUDGET.triesPerAddress)) ||
          (university &&
            !(await spend(
              `try-campus:${university.domain}`,
              SIGN_IN_BUDGET.triesPerCampus,
            )))
        )
          throw APIError.from("TOO_MANY_REQUESTS", SIGN_IN_LIMIT);
        return;
      }

      if (body?.type !== "sign-in") {
        throw APIError.from("BAD_REQUEST", {
          code: "UNSUPPORTED_OTP_TYPE",
          message: "Unsupported request.",
        });
      }
      // Never send mail to addresses that can't join.
      if (!university) {
        throw APIError.from("BAD_REQUEST", UNIVERSITY_EMAIL_REQUIRED);
      }
      // Per-address cooldown; the IP rate limit alone can't stop inbox flooding
      // from many IPs.
      const recent = await db.verification.findFirst({
        where: {
          identifier: codeIdentifier(email),
          updatedAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
        },
        select: { id: true },
      });
      if (recent) {
        throw APIError.from("TOO_MANY_REQUESTS", {
          code: "OTP_COOLDOWN",
          message:
            "We just sent you a code. Give it a few seconds before asking again.",
        });
      }
      if (
        !(await spend(`code:${address}`, SIGN_IN_BUDGET.codesPerAddress)) ||
        !(await spend(
          `code-campus:${university.domain}`,
          SIGN_IN_BUDGET.codesPerCampus,
        ))
      )
        throw APIError.from("TOO_MANY_REQUESTS", SIGN_IN_LIMIT);
    }),
    // The plugin reports success even when sending failed, because Better Auth
    // only logs a sender's error. The sender deletes an undelivered code, so a
    // missing code here means the student must hear that nothing was sent.
    after: createAuthMiddleware(async (ctx) => {
      if (
        ctx.path !== "/email-otp/send-verification-otp" ||
        isAPIError(ctx.context.returned)
      )
        return;
      const { email } = ctx.body as { email: string };
      const stored = await db.verification.findFirst({
        where: {
          identifier: codeIdentifier(email.toLowerCase()),
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!stored)
        throw APIError.from("SERVICE_UNAVAILABLE", EMAIL_DELIVERY_FAILED);
    }),
  },
  plugins: [
    emailOTP({
      otpLength: LIMITS.signInCode,
      expiresIn: 10 * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp }) {
        try {
          await sendSignInCode(email, otp);
        } catch {
          // The code is already stored. Nobody received it, so nobody may guess it.
          await db.verification.deleteMany({
            where: { identifier: codeIdentifier(email) },
          });
          console.error("Failed to send sign-in code");
        }
      },
    }),
    nextCookies(), // must stay last
  ],
  telemetry: { enabled: false },
});

export const isGoogleEnabled = Boolean(google);
