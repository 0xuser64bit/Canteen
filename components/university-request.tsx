"use client";

import { useActionState } from "react";
import { requestUniversity } from "@/server/university-requests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function UniversityRequestForm() {
  const [state, action, pending] = useActionState(requestUniversity, null);
  if (state?.ok)
    return (
      <p
        role="status"
        className="rounded-2xl bg-surface p-5 text-[15px] leading-relaxed ring-1 ring-line"
      >
        Your domain request is saved for private review. It does not change
        sign-in eligibility yet. Check back after the team verifies the
        university; no email address was collected.
      </p>
    );
  return (
    <form action={action} className="space-y-5">
      <div>
        <label
          htmlFor="university-domain"
          className="mb-2 block text-[14px] font-semibold"
        >
          University email domain
        </label>
        <Input
          id="university-domain"
          name="domain"
          required
          maxLength={253}
          autoCapitalize="none"
          autoComplete="off"
          placeholder="university.edu"
          aria-describedby="domain-help"
        />
        <p id="domain-help" className="mt-1 text-[13px] text-muted">
          Enter everything after @. Leave out your name and email address.
        </p>
      </div>
      <div>
        <label
          htmlFor="university-website"
          className="mb-2 block text-[14px] font-semibold"
        >
          Official university homepage
        </label>
        <Input
          id="university-website"
          name="website"
          type="url"
          required
          maxLength={2048}
          placeholder="https://www.university.edu"
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving request…" : "Request a domain review"}
      </Button>
    </form>
  );
}
