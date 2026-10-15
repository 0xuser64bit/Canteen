import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown wherever mental health comes up: a quiet pointer to real help. */
export function HelplineNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-pretty text-muted ring-1 ring-line",
        className,
      )}
    >
      <LifeBuoy className="mt-0.5 size-[18px] shrink-0 text-ink" aria-hidden />
      <span>
        Going through something heavy? You don&apos;t have to carry it alone.
        Free, confidential helplines for your country are at{" "}
        <a
          href="https://findahelpline.com"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-ink underline decoration-current/40 hover:decoration-current"
        >
          findahelpline.com
        </a>
        . If anyone is in immediate danger, call your local emergency number.
      </span>
    </p>
  );
}
