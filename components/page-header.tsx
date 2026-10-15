import { Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo";
import { SearchButton } from "@/components/search-button";
import { TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";

/** Sticky "you are here" bar: names the place and stays put while content scrolls. */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/85 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 pt-3 pb-3 lg:px-6 lg:pt-6">
        <Link href="/home" aria-label="Canteen home" className="lg:hidden">
          <LogoMark className="size-9" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] leading-tight font-display lg:text-[26px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>
          )}
        </div>
        {actions}
        <SearchButton className="lg:hidden">
          <Search />
        </SearchButton>
      </div>
      {children}
    </header>
  );
}

export function TopicChips({
  base,
  active,
}: {
  base: "/home" | "/campus" | `/u/${string}`;
  active?: string;
}) {
  const chip = (href: string, label: string, on: boolean) => (
    <Link
      key={href}
      href={href as "/home"}
      aria-current={on ? "page" : undefined}
      scroll={false}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
        on
          ? "bg-ink text-background"
          : "bg-surface text-muted ring-1 ring-line ring-inset hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav
      aria-label="Topics"
      className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 lg:px-6"
    >
      {chip(base, "All", !active)}
      {TOPICS.map((topic) =>
        chip(`${base}?topic=${topic.slug}`, topic.label, active === topic.slug),
      )}
    </nav>
  );
}
