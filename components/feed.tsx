"use client";

import { Loader2 } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { PostCard } from "@/components/post";
import { POST_DELETED } from "@/components/post-menu";
import { Button } from "@/components/ui/button";
import { loadMore } from "@/server/actions";
import type { FeedPage, PostSummary } from "@/server/queries";

type Scope = Parameters<typeof loadMore>[0]["scope"];

export function Feed({
  initial,
  scope,
  topic,
  unanswered,
  noReplies,
  sort,
  empty,
}: {
  initial: FeedPage;
  scope: Scope;
  topic?: string;
  unanswered?: boolean;
  noReplies?: boolean;
  sort?: Parameters<typeof loadMore>[0]["sort"];
  empty: React.ReactNode;
}) {
  const [more, setMore] = useState<PostSummary[]>([]);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [removed, setRemoved] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDeleted = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      setRemoved((ids) => [...ids, id]);
    };
    window.addEventListener(POST_DELETED, onDeleted);
    return () => window.removeEventListener(POST_DELETED, onDeleted);
  }, []);

  const fetchNext = () => {
    if (!cursor || pending) return;
    startTransition(async () => {
      const result = await loadMore({
        scope,
        topic,
        cursor,
        unanswered,
        noReplies,
        sort,
      });
      if (!result.ok) return void toast.error(result.error);
      setMore((items) => [...items, ...result.data.items]);
      setCursor(result.data.nextCursor);
    });
  };

  const onVisible = useEffectEvent(fetchNext);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onVisible();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor]);

  const seen = new Set<string>();
  const items = [...initial.items, ...more].filter((post) => {
    if (seen.has(post.id) || removed.includes(post.id)) return false;
    seen.add(post.id);
    return true;
  });

  if (items.length === 0) return <>{empty}</>;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {items.map((post, index) => (
        <PostCard key={post.id} post={post} priority={index < 2} />
      ))}
      <div ref={sentinel} className="flex justify-center py-2">
        {cursor ? (
          <Button variant="ghost" onClick={fetchNext} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? "Loading" : "Load more"}
          </Button>
        ) : (
          <p className="text-[13px] text-muted">You&apos;re all caught up.</p>
        )}
      </div>
    </div>
  );
}
