import "server-only";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { db } from "@/lib/db";
import { sendSignInCode } from "@/lib/email";
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

const RESEND_COOLDOWN_MS = 30_000;

function baseURL(): BetterAuthOptions["baseURL"] {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "production") {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // Preview deployments are reachable through several *.vercel.app aliases.
  if (process.env.VERCEL_ENV === "preview") {
    return { allowedHosts: ["*.vercel.app"], protocol: "https" };
  }
  return "http://localhost:3000";
}

// Creates the university row the first time someone from it signs up.
async function ensureUniversity(match: UniversityMatch) {
  // ponytail: if a dataset update ever reuses an existing slug for a new domain,
  // the insert is skipped and sign-up fails loudly; rename the slug by hand then.
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
    // Runs on every sign-up and Google sign-in, so removing someone from
    // TEAM_EMAILS locks them out at their next sign-in.
    validateUserInfo: ({ user }) => {
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
    },
  },
  databaseHooks: {
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
  ],
  rateLimit: {
    storage: "database",
    customRules: {
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/sign-in/email-otp": { window: 60, max: 10 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/email-otp/send-verification-otp") return;

      const body = ctx.body as { email?: unknown; type?: unknown } | undefined;
      const email =
        typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      if (body?.type !== "sign-in") {
        throw APIError.from("BAD_REQUEST", {
          code: "UNSUPPORTED_OTP_TYPE",
          message: "Unsupported request.",
        });
      }
      // Never send mail to addresses that can't join.
      if (!universityForSignIn(email)) {
        throw APIError.from("BAD_REQUEST", UNIVERSITY_EMAIL_REQUIRED);
      }
      // Per-address cooldown; the IP rate limit alone can't stop inbox flooding
      // from many IPs.
      const recent = await db.verification.findFirst({
        where: {
          identifier: `sign-in-otp-${email}`,
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
    }),
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp }) {
        try {
          await sendSignInCode(email, otp);
        } catch {
          console.error("Failed to send sign-in code");
          throw APIError.from("SERVICE_UNAVAILABLE", {
            code: "EMAIL_DELIVERY_FAILED",
            message:
              "We couldn't send the email just now. Try again in a minute.",
          });
        }
      },
    }),
    nextCookies(), // must stay last
  ],
  telemetry: { enabled: false },
});

export const isGoogleEnabled = Boolean(google);
// Development prints codes to the console, so email sign-in always works locally.
export const isEmailEnabled =
  Boolean(process.env.RESEND_API_KEY) || process.env.NODE_ENV !== "production";
