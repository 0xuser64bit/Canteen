"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="wallpaper flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[28px] leading-tight font-display">
        Something went sideways.
      </h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
        We couldn&apos;t load this just now. It&apos;s probably temporary.
      </p>
      <Button variant="primary" className="mt-6" onClick={reset}>
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}
