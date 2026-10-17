"use client";

import { Plus, UserPlus, UserRound, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { share } from "@/components/post-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "canteen:invite-dismissed";
const DISMISSED_EVENT = "canteen:invite-dismissed";

function readDismissed() {
  try {
    return Number(localStorage.getItem(DISMISSED_KEY) ?? -1);
  } catch {
    return -1;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(DISMISSED_EVENT, onChange);
  return () => window.removeEventListener(DISMISSED_EVENT, onChange);
}

/** Seats at the table: classmates who joined, you in yellow, and the empty ones. */
function Seats({
  members,
  goal,
  small,
}: {
  members: number;
  goal: number;
  small?: boolean;
}) {
  const size = small
    ? "size-7 [&_svg]:size-3.5"
    : "size-10 [&_svg]:size-[18px]";
  return (
    <div
      className="flex -space-x-1.5"
      role="img"
      aria-label={`${members} of ${goal} students have joined`}
    >
      {Array.from({ length: goal }, (_, seat) => (
        <span
          key={seat}
          className={cn(
            "grid shrink-0 place-items-center rounded-full ring-[3px] ring-surface",
            size,
            seat === 0
              ? "bg-you text-you-ink"
              : seat < members
                ? "bg-ink text-background"
                : "border-2 border-dashed border-line-strong bg-surface text-muted",
          )}
        >
          {seat < members ? <UserRound /> : <Plus />}
        </span>
      ))}
    </div>
  );
}

/**
 * Below `goal` members a campus stays unnamed to other universities, which also
 * makes its students easier to tell apart. Every invite gets it closer.
 */
export function InviteCard({
  university,
  members,
  goal,
  compact,
}: {
  university: string;
  members: number;
  goal: number;
  compact?: boolean;
}) {
  // Dismissing remembers the count, so the next classmate to join brings it back.
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed() === members,
    () => false,
  );
  if (compact && dismissed) return null;

  const left = goal - members;
  const headline = compact
    ? `${left} more to name ${university} across campuses`
    : `${left} more ${left === 1 ? "student" : "students"} to name ${university} across campuses`;
  const invite = () =>
    share("/campus", "Canteen", {
      text: `I'm on Canteen, with university-email sign-in and per-thread aliases. ${left} more from ${university} and our university can be named across campuses. Campus discussions already work.`,
      copied: "Invite copied. Paste it in your class chat.",
    });

  if (compact) {
    return (
      <div className="mx-4 mt-4 flex items-center gap-3 rounded-[22px] bg-surface py-2.5 pr-2 pl-3 shadow-soft ring-1 ring-line lg:mx-6">
        <span className="hidden sm:block">
          <Seats members={members} goal={goal} small />
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-snug font-semibold text-pretty">
          {headline}
        </p>
        <Button size="sm" variant="primary" onClick={invite}>
          <UserPlus /> Invite
        </Button>
        <button
          type="button"
          aria-label="Hide for now"
          onClick={() => {
            try {
              localStorage.setItem(DISMISSED_KEY, String(members));
            } catch {
              // Storage can be unavailable; the card just stays.
            }
            window.dispatchEvent(new Event(DISMISSED_EVENT));
          }}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <section className="mx-4 mt-4 rounded-[28px] bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6 lg:mx-6">
      <Seats members={members} goal={goal} />
      <h2 className="mt-4 text-[19px] font-bold tracking-tight text-balance">
        {headline}
      </h2>
      <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-pretty text-muted">
        Until {goal} students from {university} join, other universities see
        your posts as coming from a university in your country, and anonymity on
        this page is thin. A few classmates fixes both.
      </p>
      <Button variant="primary" className="mt-4" onClick={invite}>
        <UserPlus /> Invite classmates
      </Button>
    </section>
  );
}
