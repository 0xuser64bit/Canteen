"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-current opacity-0 transition-opacity duration-150 motion-reduce:transition-none",
          pending && "opacity-60 delay-150",
        )}
      />
      <span role="status" className="sr-only">
        {pending ? "Opening…" : ""}
      </span>
    </>
  );
}

export function NavigationLink({
  children,
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props} className={cn("relative", className)}>
      {children}
      <NavigationFeedback />
    </Link>
  );
}
