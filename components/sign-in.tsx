"use client";

import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  Loader2,
  MailCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { lookupUniversity } from "@/server/actions";

const RESEND_SECONDS = 30;

const ERROR_MESSAGES: Record<string, string> = {
  UNIVERSITY_EMAIL_REQUIRED:
    "That account isn't from a university we recognize. Use the Google account your university gave you.",
  account_not_linked: "That email is already linked to another sign-in method.",
  ACCOUNT_SUSPENDED: "This account was suspended for breaking Canteen's rules.",
  SIGN_IN_LIMIT: "Too many sign-in attempts for now. Try again in an hour.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.9 11.9 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}

function useUniversityHint(email: string) {
  const [hint, setHint] = useState<{
    email: string;
    name: string | null;
  } | null>(null);
  const domain = email.split("@")[1] ?? "";
  const complete = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim());

  useEffect(() => {
    if (!complete) return;
    const value = email.trim();
    const timer = setTimeout(async () => {
      const match = await lookupUniversity(value);
      setHint({ email: value, name: match?.name ?? null });
    }, 250);
    return () => clearTimeout(timer);
  }, [email, complete]);

  // Only show a hint that belongs to what's typed right now.
  return complete && hint?.email === email.trim() && domain ? hint : null;
}

export function SignIn({
  emailEnabled,
  googleEnabled,
  initialError,
  returnTo = "/campus",
}: {
  emailEnabled: boolean;
  googleEnabled: boolean;
  initialError?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>(
    initialError
      ? (ERROR_MESSAGES[initialError] ??
          "Sign-in didn't work. Please try again.")
      : undefined,
  );
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();
  const codeInput = useRef<HTMLInputElement>(null);
  const hint = useUniversityHint(email);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = () =>
    startTransition(async () => {
      setError(undefined);
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      });
      if (error)
        return setError(error.message ?? "We couldn't send a code. Try again.");
      setStep("code");
      setCode("");
      setCooldown(RESEND_SECONDS);
      requestAnimationFrame(() => codeInput.current?.focus());
    });

  const verify = (otp: string) =>
    startTransition(async () => {
      setError(undefined);
      const { error } = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp,
      });
      if (error) {
        setCode("");
        return setError(
          error.code === "TOO_MANY_ATTEMPTS"
            ? "Too many wrong tries. Ask for a new code."
            : error.code === "OTP_EXPIRED"
              ? "That code expired. Ask for a new one."
              : ((error.code && ERROR_MESSAGES[error.code]) ??
                (error.status === 429
                  ? "Too many tries in a row. Wait a minute, then try again."
                  : "That code didn't match. Check the email and try again.")),
        );
      }
      router.replace(returnTo as Route);
      router.refresh();
    });

  const onEmailSubmit = (event: FormEvent) => {
    event.preventDefault();
    sendCode();
  };

  const google = () =>
    startTransition(async () => {
      setError(undefined);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: returnTo,
        errorCallbackURL: `/join?next=${encodeURIComponent(returnTo)}`,
      });
    });

  if (!emailEnabled && !googleEnabled) {
    return (
      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[14px] leading-relaxed text-muted ring-1 ring-line">
        Sign-ups are paused for a moment while we finish setting up. Check back
        soon.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/university-request"
        className="text-[13px] text-muted underline"
      >
        University domain not recognized? Request a review
      </Link>
      {error && (
        <p
          role="alert"
          className="flex gap-2.5 rounded-2xl bg-danger-surface px-4 py-3 text-[14px] leading-snug font-medium text-danger"
        >
          <CircleAlert className="mt-px size-[18px] shrink-0" /> {error}
        </p>
      )}

      {googleEnabled && step === "email" && (
        <>
          <Button
            variant="secondary"
            size="lg"
            onClick={google}
            disabled={pending}
            className="w-full bg-surface"
          >
            <GoogleIcon /> Continue with Google
          </Button>
          <p className="-mt-1 px-1 text-center text-[13px] text-muted">
            Use the account your university gave you, not a personal Gmail.
          </p>
          {emailEnabled && (
            <div className="flex items-center gap-3 text-[12px] font-semibold text-muted">
              <span className="h-px flex-1 bg-line" /> or use a code{" "}
              <span className="h-px flex-1 bg-line" />
            </div>
          )}
        </>
      )}

      {emailEnabled && step === "email" && (
        <form onSubmit={onEmailSubmit} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-[14px] font-semibold">
            University email
          </label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            spellCheck={false}
            required
            placeholder="you@university.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="min-h-5 px-1 text-[13px]" aria-live="polite">
            {hint?.name ? (
              <span className="flex items-center gap-1.5 font-semibold">
                <BadgeCheck className="size-4" /> {hint.name}
              </span>
            ) : hint ? (
              <span className="text-muted">
                We don&apos;t recognize that domain as a university yet.
              </span>
            ) : (
              <span className="text-muted">
                We&apos;ll email you a 6-digit code. No password needed.
              </span>
            )}
          </p>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={pending || !email.includes("@")}
          >
            {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}{" "}
            Send code
          </Button>
        </form>
      )}

      {step === "code" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === 6) verify(code);
          }}
          className="flex flex-col gap-3"
        >
          <p className="flex gap-2.5 text-[14px] leading-relaxed text-muted">
            <MailCheck className="mt-0.5 size-[18px] shrink-0 text-ink" />
            <span>
              We sent a code to{" "}
              <span className="font-semibold text-ink">{email.trim()}</span>. It
              expires in 10 minutes.
            </span>
          </p>
          <label htmlFor="code" className="sr-only">
            6-digit code
          </label>
          <Input
            ref={codeInput}
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(digits);
              if (digits.length === 6) verify(digits);
            }}
            className="h-16 text-center text-[28px] font-bold tracking-[0.45em] tabular"
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={pending || code.length !== 6}
          >
            {pending && <Loader2 className="animate-spin" />} Verify and enter
          </Button>
          <div className="flex items-center justify-between px-1 text-[13px]">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(undefined);
              }}
              className="cursor-pointer font-semibold text-muted hover:text-ink"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={cooldown > 0 || pending}
              className="cursor-pointer font-semibold text-muted tabular hover:text-ink disabled:cursor-default disabled:opacity-60"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
