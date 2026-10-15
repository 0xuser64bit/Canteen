import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="wallpaper flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="size-14" />
      <h1 className="mt-6 text-[clamp(2rem,6vw,3.25rem)] leading-none font-display">
        This thread went quiet.
      </h1>
      <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-muted">
        It was deleted, hidden after reports, or it&apos;s a campus-only post
        from another university.
      </p>
      <Button asChild variant="primary" size="lg" className="mt-8">
        <Link href="/home">Back to the feed</Link>
      </Button>
    </main>
  );
}
