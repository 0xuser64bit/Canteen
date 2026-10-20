import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl bg-surface-2 px-4 text-[16px] text-ink ring-1 ring-line transition-[box-shadow,background-color] duration-150 ring-inset placeholder:text-muted hover:ring-line-strong focus:bg-surface focus:ring-2 focus:ring-ink focus:outline-none disabled:opacity-60 aria-invalid:ring-danger dark:focus:ring-you";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        fieldBase,
        "[field-sizing:content] min-h-28 resize-none py-3 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({
  children,
  id,
}: {
  children?: string;
  id?: string;
}) {
  if (!children) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 px-1 text-[13px] font-medium text-danger"
    >
      {children}
    </p>
  );
}

/** Live length budget; quiet until the writer gets close. */
export function Counter({ value, max }: { value: number; max: number }) {
  const left = max - value;
  if (left > max * 0.2) return null;
  return (
    <span
      className={cn(
        "text-[12px] font-medium tabular",
        left < 0 ? "text-danger" : "text-muted",
      )}
      aria-live="polite"
    >
      {left}
    </span>
  );
}
