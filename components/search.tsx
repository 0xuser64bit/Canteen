"use client";

import { Command } from "cmdk";
import {
  CornerDownLeft,
  Hash,
  Loader2,
  MessageSquareText,
  PenLine,
  School,
  Search,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { countryName } from "@/lib/countries";
import { threadHref } from "@/lib/return-to";
import { TOPICS, topicLabel } from "@/lib/topics";
import { searchCanteen } from "@/server/actions";
import type { SearchResults } from "@/server/queries";

const OPEN_EVENT = "canteen:search";

export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const itemClass =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] data-[selected=true]:bg-surface-3 [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-muted";

type SearchState =
  | { query: string; status: "loading" | "error" }
  | (SearchResults & { query: string; status: "ready" });

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchState | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  const trimmed = query.trim();
  useEffect(() => {
    if (!open || trimmed.length < 2) return;
    let active = true;
    const timer = setTimeout(async () => {
      setResults({ query: trimmed, status: "loading" });
      try {
        const next = await searchCanteen(trimmed);
        if (active) setResults({ query: trimmed, status: "ready", ...next });
      } catch {
        if (active) setResults({ query: trimmed, status: "error" });
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, trimmed, retry]);

  const go = <T extends string>(href: Route<T>) => {
    setOpen(false);
    setQuery("");
    if (href.startsWith("/p/")) {
      const from = location.pathname.startsWith("/p/")
        ? (new URLSearchParams(location.search).get("from") ?? "/campus")
        : `${location.pathname}${location.search}`;
      router.push(threadHref(href as `/p/${string}`, from));
    } else router.push(href);
  };

  const searching = trimmed.length >= 2;
  const current = searching && results?.query === trimmed ? results : null;
  const pending = searching && (!current || current.status === "loading");
  const matches = current?.status === "ready" ? current : null;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Search Canteen"
      shouldFilter={!searching}
      overlayClassName="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
      contentClassName="fixed inset-x-3 top-[10dvh] z-50 mx-auto max-w-xl overflow-hidden rounded-[24px] bg-surface shadow-pop ring-1 ring-line"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        {pending ? (
          <Loader2 className="size-5 shrink-0 animate-spin text-muted" />
        ) : (
          <Search className="size-5 shrink-0 text-muted" />
        )}
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search posts and universities"
          className="h-14 w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
        />
      </div>
      <Command.List className="max-h-[min(60dvh,440px)] overflow-y-auto overscroll-contain p-2">
        {searching ? (
          <>
            {pending && (
              <p
                role="status"
                className="px-3 py-8 text-center text-[14px] text-muted"
              >
                Searching…
              </p>
            )}
            {current?.status === "error" && (
              <div className="flex flex-col items-center gap-3 px-3 py-6 text-center">
                <p role="status" className="max-w-sm text-[14px] text-muted">
                  Search couldn&apos;t load. Check your connection and try
                  again.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setResults({ query: trimmed, status: "loading" });
                    setRetry((value) => value + 1);
                  }}
                >
                  Retry
                </Button>
              </div>
            )}
            {matches &&
              matches.posts.length === 0 &&
              matches.universities.length === 0 && (
                <p className="px-3 py-8 text-center text-[14px] text-muted">
                  Nothing matches &ldquo;{trimmed}&rdquo; yet.
                </p>
              )}
            {matches && matches.posts.length > 0 && (
              <Command.Group
                heading="Posts"
                className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
              >
                {matches.posts.map((post) => (
                  <Command.Item
                    key={post.id}
                    value={`post-${post.id}`}
                    onSelect={() => go(`/p/${post.id}`)}
                    className={itemClass}
                  >
                    <MessageSquareText />
                    <span className="flex-1 truncate">{post.title}</span>
                    <span className="text-[12px] text-muted">
                      {topicLabel(post.topic)}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {matches && matches.universities.length > 0 && (
              <Command.Group
                heading="Universities"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
              >
                {matches.universities.map((u) => (
                  <Command.Item
                    key={u.slug}
                    value={`uni-${u.slug}`}
                    onSelect={() => go(`/u/${u.slug}`)}
                    className={itemClass}
                  >
                    <School />
                    <span className="flex-1 truncate">{u.name}</span>
                    <span className="text-[12px] text-muted">
                      {countryName(u.countryCode)}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </>
        ) : (
          <>
            <Command.Empty className="px-3 py-8 text-center text-[14px] text-muted">
              No shortcut by that name.
            </Command.Empty>
            <Command.Group
              heading="Go to"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
            >
              <Command.Item onSelect={() => go("/new")} className={itemClass}>
                <PenLine />
                <span className="flex-1">Write a post</span>
              </Command.Item>
              <Command.Item
                onSelect={() => go("/campus")}
                className={itemClass}
              >
                <School />
                <span className="flex-1">My campus</span>
              </Command.Item>
              {TOPICS.map((topic) => (
                <Command.Item
                  key={topic.id}
                  onSelect={() => go(`/home?topic=${topic.slug}`)}
                  className={itemClass}
                >
                  <Hash />
                  <span className="flex-1">{topic.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </>
        )}
      </Command.List>
      <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[12px] text-muted pointer-coarse:hidden">
        <span className="flex items-center gap-1.5">
          <CornerDownLeft className="size-3.5" /> to open
        </span>
        <span>esc to close</span>
      </div>
    </Command.Dialog>
  );
}
