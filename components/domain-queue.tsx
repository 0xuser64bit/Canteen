"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewUniversityRequest } from "@/server/university-requests";

export function DomainQueue({
  requests,
}: {
  requests: { id: string; domain: string; website: string }[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <section className="space-y-3 border-b border-line pb-6">
      <h2 className="text-[18px] font-semibold">University domain requests</h2>
      <p className="text-[13px] text-muted">
        Verify official ownership and update the bundled dataset before marking
        a request resolved. Reviewing a request never bypasses email
        verification. Showing the oldest 50 pending requests.
      </p>
      {requests.length ? (
        <ul className="divide-y divide-line">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center gap-3 py-3 text-[13px]"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold break-words">{request.domain}</p>
                <a
                  href={request.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="break-all text-muted underline"
                >
                  Official homepage submitted for review
                </a>
              </div>
              {[true, false].map((resolved) => (
                <Button
                  key={String(resolved)}
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        const result = await reviewUniversityRequest(
                          request.id,
                          resolved,
                        );
                        if (!result.ok) toast.error(result.error);
                      } catch {
                        toast.error(
                          "The review could not be saved. Try again.",
                        );
                      }
                    })
                  }
                >
                  {resolved ? "Mark resolved" : "Dismiss"}
                </Button>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-muted">No domains waiting for review.</p>
      )}
    </section>
  );
}
