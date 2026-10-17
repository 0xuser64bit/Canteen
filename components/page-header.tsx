import { Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo";
import { SearchButton } from "@/components/search-button";
import { TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import type { FeedSort } from "@/server/queries";

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
        <Link href="/campus" aria-label="Canteen home" className="lg:hidden">
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
  unanswered,
}: {
  base: "/home" | "/campus" | `/u/${string}`;
  active?: string;
  unanswered?: boolean;
}) {
  const chip = (href: string, label: string, on: boolean) => (
    <Link
      key={href}
      href={
        (unanswered
          ? `${href}${href.includes("?") ? "&" : "?"}unanswered=1`
          : href) as "/home"
      }
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

export function QuestionFilter({
  base,
  active,
  topic,
}: {
  base: "/home" | "/campus";
  active: boolean;
  topic?: string;
}) {
  const params = new URLSearchParams(topic ? { topic } : {});
  const all = `${base}?${params}` as "/campus";
  params.set("unanswered", "1");
  return (
    <nav
      aria-label="Questions"
      className="flex gap-4 px-4 pb-3 text-[13px] lg:px-6"
    >
      <Link
        href={all}
        aria-current={!active ? "page" : undefined}
        className={!active ? "font-bold text-ink" : "text-muted"}
      >
        All posts
      </Link>
      <Link
        href={`${base}?${params}` as "/campus"}
        aria-current={active ? "page" : undefined}
        className={active ? "font-bold text-ink" : "text-muted"}
      >
        Needs an answer
      </Link>
    </nav>
  );
}

export function FeedControls({
  base,
  topic,
  unanswered,
  noReplies,
  sort,
  collection,
}: {
  base: "/campus" | "/home" | "/me";
  topic?: string;
  unanswered?: boolean;
  noReplies?: boolean;
  sort: FeedSort;
  collection?: string;
}) {
  const params = new URLSearchParams();
  if (topic) params.set("topic", topic);
  if (unanswered) params.set("unanswered", "1");
  if (noReplies) params.set("noReplies", "1");
  if (collection) params.set("collection", collection);
  const link = (value: FeedSort, label: string) => {
    const query = new URLSearchParams(params);
    query.set("sort", value);
    return (
      <Link
        key={value}
        href={`${base}?${query}` as "/home"}
        scroll={false}
        aria-current={sort === value ? "page" : undefined}
        className={cn(
          "rounded-full px-3 py-1.5",
          sort === value
            ? "bg-ink font-semibold text-background"
            : "text-muted hover:bg-surface-3",
        )}
      >
        {label}
      </Link>
    );
  };
  const toggle = new URLSearchParams(params);
  toggle.set("sort", sort);
  if (noReplies) toggle.delete("noReplies");
  else toggle.set("noReplies", "1");
  return (
    <nav
      aria-label="Feed order"
      className="flex flex-wrap items-center gap-2 px-4 pb-3 text-[13px] lg:px-6"
    >
      {link("newest", "Latest")}
      {unanswered && link("oldest", "Oldest waiting")}
      {topic === "opportunities" && link("closing", "Closing soon")}
      {unanswered && (
        <Link
          href={`${base}?${toggle}` as "/campus"}
          scroll={false}
          aria-current={noReplies ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 ring-1 ring-line",
            noReplies ? "bg-ink text-background" : "text-muted",
          )}
        >
          No replies yet
        </Link>
      )}
    </nav>
  );
}
