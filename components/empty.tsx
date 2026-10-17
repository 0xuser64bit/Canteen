import { PenLine } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Empty feeds still read like a chat: a quiet system message and an obvious next step. */
export function EmptyState({
  title,
  body,
  action = true,
  topic,
  campus,
}: {
  title: string;
  body: ReactNode;
  action?: boolean;
  topic?: string;
  campus?: string;
}) {
  const params = new URLSearchParams();
  if (topic) params.set("topic", topic);
  if (campus) params.set("campus", campus);
  return (
    <div className="wallpaper flex min-h-[60dvh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-sm rounded-[28px] bg-surface px-6 py-7 shadow-soft ring-1 ring-line">
        <h2 className="text-[19px] font-bold tracking-tight text-balance">
          {title}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted">
          {body}
        </p>
        {action && (
          <Button asChild variant="primary" className="mt-5">
            <Link href={params.size ? `/new?${params}` : "/new"}>
              <PenLine /> Start a thread
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
