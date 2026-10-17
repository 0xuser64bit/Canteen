"use client";

import {
  Bell,
  Briefcase,
  Home,
  PenLine,
  Plus,
  School,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { Logo } from "@/components/logo";
import { openSearch } from "@/components/search";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = {
  href:
    | "/home"
    | "/campus"
    | "/home?topic=opportunities"
    | "/notifications"
    | "/me"
    | "/mod";
  label: string;
  short: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  active: (path: string, topic: string | null) => boolean;
};

const ITEMS: Item[] = [
  {
    href: "/campus",
    label: "My campus",
    short: "Campus",
    icon: School,
    active: (p) => p === "/campus",
  },
  {
    href: "/home",
    label: "Everyone",
    short: "Feed",
    icon: Home,
    active: (p, t) => p === "/home" && t !== "opportunities",
  },
  {
    href: "/home?topic=opportunities",
    label: "Opportunities",
    short: "Jobs",
    icon: Briefcase,
    active: (p, t) => p === "/home" && t === "opportunities",
  },
  {
    href: "/notifications",
    label: "Notifications",
    short: "Alerts",
    icon: Bell,
    active: (p) => p === "/notifications",
  },
  {
    href: "/me",
    label: "You",
    short: "You",
    icon: UserRound,
    active: (p) => p === "/me",
  },
];

const MODERATION: Item = {
  href: "/mod",
  label: "Moderation",
  short: "Mod",
  icon: ShieldCheck,
  active: (p) => p === "/mod",
};

export const NOTIFICATIONS_READ = "canteen:notifications-read";

/** The server count, zeroed once the notifications page marks it read. */
function useUnread(unread: number) {
  const [cleared, setCleared] = useState<number | null>(null);
  useEffect(() => {
    const onRead = () => setCleared(unread);
    window.addEventListener(NOTIFICATIONS_READ, onRead);
    return () => window.removeEventListener(NOTIFICATIONS_READ, onRead);
  }, [unread]);
  return cleared === unread ? 0 : unread;
}

function useActive() {
  const pathname = usePathname();
  const topic = useSearchParams().get("topic");
  return (item: Item) => item.active(pathname, topic);
}

function Badge({
  count,
  className,
  label = "unread",
}: {
  count: number;
  className?: string;
  label?: string;
}) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[11px] leading-none font-bold text-white tabular",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

export function SideNav({
  unread: serverUnread,
  university,
  team,
  modQueue,
}: {
  unread: number;
  university: string;
  team: boolean;
  /** Open reports, for moderators only. */
  modQueue?: number;
}) {
  const isActive = useActive();
  const pathname = usePathname();
  const unread = useUnread(serverUnread);
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col px-4 py-5 lg:flex"
    >
      <Link
        href="/campus"
        className="mb-7 rounded-xl px-3 py-1"
        aria-label="Canteen home"
      >
        <Logo />
      </Link>
      <ul className="flex flex-col gap-1">
        {(modQueue === undefined ? ITEMS : [...ITEMS, MODERATION]).map(
          (item) => {
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-12 items-center gap-3.5 rounded-2xl px-3.5 text-[15px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-ink",
                    active &&
                      "bg-surface font-semibold text-ink shadow-soft ring-1 ring-line",
                  )}
                >
                  <item.icon
                    className={cn("size-[22px]", active && "stroke-[2.4]")}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/notifications" && <Badge count={unread} />}
                  {item.href === "/mod" && (
                    <Badge count={modQueue ?? 0} label="waiting" />
                  )}
                </Link>
              </li>
            );
          },
        )}
      </ul>
      <Button asChild variant="primary" size="lg" className="mt-6 w-full">
        <Link href="/new">
          <PenLine /> New post
        </Link>
      </Button>
      <div className="mt-auto flex flex-col gap-3">
        <Link
          href="/settings"
          aria-current={pathname === "/settings" ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-[14px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-ink",
            pathname === "/settings" && "bg-surface text-ink ring-1 ring-line",
          )}
        >
          <Settings2 aria-hidden className="size-[18px]" /> Settings
        </Link>
        <button
          type="button"
          onClick={openSearch}
          className="flex h-11 cursor-pointer items-center gap-3 rounded-2xl bg-surface-2 px-3.5 text-[14px] text-muted ring-1 ring-line transition-colors ring-inset hover:text-ink"
        >
          <Search className="size-[18px]" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded-md bg-surface px-1.5 py-0.5 font-sans text-[11px] font-semibold ring-1 ring-line">
            ⌘K
          </kbd>
        </button>
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="truncate text-[13px] text-muted" title={university}>
            {team ? "Signed in as" : "Verified at"}{" "}
            <span className="font-semibold text-ink">{university}</span>
          </p>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

export function MobileNav({ unread: serverUnread }: { unread: number }) {
  const isActive = useActive();
  const unread = useUnread(serverUnread);
  const pathname = usePathname();
  // Threads and the composer own the bottom of the screen.
  if (pathname.startsWith("/p/") || pathname === "/new") return null;

  const [feed, campus, , alerts, you] = ITEMS as [Item, Item, Item, Item, Item];
  const tab = (item: Item) => {
    const active =
      isActive(item) || (item.href === "/me" && pathname === "/settings");
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex flex-1 flex-col items-center gap-1 pt-2 text-[11px] font-medium text-muted",
          active && "text-ink",
        )}
      >
        <item.icon className={cn("size-6", active && "stroke-[2.4]")} />
        {item.short}
        {item.href === "/notifications" && (
          <Badge count={unread} className="absolute top-1 left-1/2 ml-1" />
        )}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      data-mobile-nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(64px+env(safe-area-inset-bottom))] items-start border-t border-line bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {tab(feed)}
      {tab(campus)}
      <div className="flex flex-1 justify-center pt-1.5">
        <Link
          href="/new"
          aria-label="New post"
          className="grid size-12 place-items-center rounded-full bg-you text-you-ink shadow-soft transition-transform active:scale-95"
        >
          <Plus className="size-6 stroke-[2.6]" />
        </Link>
      </div>
      {tab(alerts)}
      {tab(you)}
    </nav>
  );
}
