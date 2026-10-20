"use client";

import {
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Check,
  Eye,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import {
  useEffect,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import { AliasAvatar, AliasName } from "@/components/alias";
import { HelplineNote } from "@/components/helpline";
import { PollView } from "@/components/poll";
import { reducedMotion } from "@/components/preferences";
import { Linkified } from "@/components/linkified";
import { LikeButton, PostImage, UniversityLabel } from "@/components/post";
import { CommentMenu, PostMenu } from "@/components/post-menu";
import { DateTime, TimeAgo } from "@/components/time";
import { ThreadLink } from "@/components/thread-link";
import { Button } from "@/components/ui/button";
import { Counter } from "@/components/ui/field";
import { topicLabel } from "@/lib/topics";
import { cn, compactNumber } from "@/lib/utils";
import { LIMITS } from "@/lib/validation";
import { threadHref, threadReturnTo } from "@/lib/return-to";
import { addComment, recordView, markHelpful } from "@/server/actions";
import type { Thread, ThreadComment } from "@/server/queries";

type Reply = ThreadComment & { sending?: boolean };

const GROUP_WINDOW_MS = 10 * 60_000;
const REPLY_BAR_ID = "reply-bar";

function BackButton() {
  const router = useRouter();
  const search = useSearchParams();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() =>
        router.replace(threadReturnTo(search.get("from")) as Route)
      }
      className="-ml-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition-colors hover:bg-surface-3"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}

function OpBadge({ mine }: { mine?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-px text-[10px] font-bold tracking-wide uppercase",
        mine ? "bg-you-ink/10 text-you-ink" : "bg-ink text-background",
      )}
      title="Original poster"
    >
      OP
    </span>
  );
}

function ReplyBubble({
  reply,
  grouped,
  lastInGroup,
}: {
  reply: Reply;
  grouped: boolean;
  lastInGroup: boolean;
}) {
  const mine = reply.isMine;
  const ref = useRef<HTMLDivElement>(null);
  const risen = useRef(false);

  // Signature moment: a reply you send rises out of the composer into its slot.
  useLayoutEffect(() => {
    const node = ref.current;
    // Once per bubble: StrictMode re-runs effects, and a second run would
    // measure the already-transformed node.
    if (!reply.sending || !node || risen.current) return;
    risen.current = true;
    // Jump to the newest message first (chat apps do), so the bubble lands
    // just above the composer instead of behind it.
    window.scrollTo({ top: document.documentElement.scrollHeight });
    if (reducedMotion()) return;
    const composer = document
      .getElementById(REPLY_BAR_ID)
      ?.getBoundingClientRect();
    const rise = composer
      ? Math.max(composer.top - node.getBoundingClientRect().top, 24)
      : 24;
    node.animate(
      [
        { transform: `translateY(${rise}px) scale(0.9)`, opacity: 0.3 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 520, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
    );
  }, [reply.sending]);

  return (
    <div
      ref={ref}
      className={cn(
        "group/reply flex origin-bottom-right items-end gap-2",
        mine && "flex-row-reverse",
        grouped ? "mt-1" : "mt-4",
      )}
    >
      {!mine &&
        (lastInGroup ? (
          <AliasAvatar alias={reply.alias} className="size-8 text-[12px]" />
        ) : (
          <span className="w-8 shrink-0" />
        ))}
      <div
        className={cn(
          "flex max-w-[82%] min-w-0 flex-col sm:max-w-[72%]",
          mine && "items-end",
        )}
      >
        {!grouped && !mine && (
          <div className="mb-1 flex max-w-full items-center gap-1.5 px-1 text-[12px] text-muted">
            <AliasName alias={reply.alias} className="shrink-0 text-[13px]" />
            {reply.isAuthor && <OpBadge />}
            <span aria-hidden>·</span>
            <UniversityLabel university={reply.university} />
          </div>
        )}
        {!grouped && mine && reply.isAuthor && (
          <div className="mb-1 px-1">
            <OpBadge mine />
          </div>
        )}
        <div
          className={cn(
            "rounded-[22px] px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap",
            mine
              ? "bg-you text-you-ink"
              : "bg-surface shadow-soft ring-1 ring-line",
            mine
              ? grouped
                ? "rounded-tr-lg"
                : "rounded-tr-md"
              : grouped
                ? "rounded-tl-lg"
                : "rounded-tl-md",
            reply.sending && "opacity-80",
          )}
        >
          {reply.hidden && (
            <span className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold">
              <ShieldAlert className="size-3.5" /> Hidden from others. Only you
              can see it.
            </span>
          )}
          <Linkified text={reply.body} />
          <span
            className={cn(
              "ml-3 inline-block translate-y-0.5 text-[11px] font-medium",
              mine ? "text-you-muted" : "text-muted",
            )}
          >
            {reply.sending ? "Sending…" : <TimeAgo date={reply.createdAt} />}
          </span>
        </div>
      </div>
      {!reply.sending && <CommentMenu id={reply.id} isMine={mine} />}
    </div>
  );
}

function HelpfulReply({ thread, reply }: { thread: Thread; reply: Reply }) {
  const [pending, startTransition] = useTransition();
  const selected = thread.helpfulCommentId === reply.id;
  if (thread.kind !== "QUESTION" || reply.hidden || reply.sending) return null;
  if (!thread.isMine || reply.isMine || thread.hidden)
    return selected ? (
      <p className="mt-1 text-[12px] font-semibold text-muted">
        <Check aria-hidden className="inline size-3.5" /> Marked helpful by the
        author
      </p>
    ) : null;
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={selected}
      className="mt-1 cursor-pointer rounded-full px-2 py-1 text-[12px] font-semibold text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-50"
      onClick={() =>
        startTransition(async () => {
          const result = await markHelpful(
            thread.id,
            selected ? null : reply.id,
          );
          if (!result.ok) toast.error(result.error);
        })
      }
    >
      {selected ? (
        <>
          <Check aria-hidden className="inline size-3.5" /> Helpful · undo
        </>
      ) : (
        "Mark helpful"
      )}
    </button>
  );
}

function ReplyBar({
  thread,
  onSend,
}: {
  thread: Thread;
  onSend: (body: string) => Promise<boolean>;
}) {
  const [body, setBody] = useState("");
  const [failed, setFailed] = useState<string | null>(null);
  const editor = useRef("");
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const empty = body.trim().length === 0;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (empty || pending || body.length > LIMITS.comment.max) return;
    const text = body;
    setBody("");
    editor.current = "";
    startTransition(async () => {
      let sent = false;
      try {
        sent = await onSend(text);
      } catch {
        toast.error(
          "Couldn't confirm your reply. Check your connection and try again.",
        );
      }
      if (!sent) {
        if (editor.current === "") {
          editor.current = text;
          setBody(text);
        } else
          setFailed((previous) => (previous ? `${previous}\n\n${text}` : text));
      }
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    // Enter sends on keyboards; on touch screens it makes a new line, like chat apps.
    const sends =
      event.metaKey ||
      event.ctrlKey ||
      (!event.shiftKey && matchMedia("(pointer: fine)").matches);
    if (sends) {
      event.preventDefault();
      form.current?.requestSubmit();
    }
  };

  return (
    <form
      id={REPLY_BAR_ID}
      ref={form}
      onSubmit={submit}
      className="sticky bottom-0 z-20 border-t border-line bg-background/90 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:px-6"
    >
      {failed !== null && (
        <details className="mb-2 rounded-xl bg-surface-2 p-3 text-[13px]">
          <summary>A previous reply needs confirmation</summary>
          <p className="my-2 break-words whitespace-pre-wrap">{failed}</p>
          <button
            type="button"
            className="cursor-pointer font-semibold underline"
            onClick={() => {
              const restored = editor.current
                ? `${failed}\n\n${editor.current}`
                : failed;
              editor.current = restored;
              setBody(restored);
              setFailed(null);
            }}
          >
            Restore with current draft
          </button>
        </details>
      )}
      <div className="flex items-end gap-2 rounded-[26px] bg-surface p-1.5 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-ink dark:focus-within:ring-you">
        <label htmlFor="reply" className="sr-only">
          Reply
        </label>
        <textarea
          id="reply"
          rows={1}
          value={body}
          onChange={(event) => {
            editor.current = event.target.value;
            setBody(event.target.value);
          }}
          onKeyDown={onKeyDown}
          placeholder="Write a reply"
          maxLength={LIMITS.comment.max + 200}
          className="[field-sizing:content] max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-[16px] leading-relaxed outline-none placeholder:text-muted"
        />
        <span className="self-center">
          <Counter value={body.length} max={LIMITS.comment.max} />
        </span>
        <button
          type="submit"
          disabled={empty || body.length > LIMITS.comment.max}
          aria-label="Send reply"
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-you text-you-ink transition-[transform,background-color,color] duration-150 active:scale-90 disabled:cursor-default disabled:bg-surface-3 disabled:text-muted"
        >
          <ArrowUp className="size-5 stroke-[2.6]" />
        </button>
      </div>
      <p className="mt-1.5 px-3 text-[12px] text-muted">
        You appear as <AliasName alias={thread.viewerAlias} /> in this thread.
      </p>
    </form>
  );
}

export function ThreadView({ thread }: { thread: Thread }) {
  const router = useRouter();
  const search = useSearchParams();
  const unconfirmedReplies = useRef(new Map<string, string>());
  const [replies, addReply] = useOptimistic<Reply[], Reply>(
    thread.comments,
    (current, reply) =>
      current.some((item) => item.id === reply.id)
        ? current
        : [...current, reply],
  );

  useEffect(() => {
    recordView(thread.id);
  }, [thread.id]);

  // shortcut: ten-second polling; use push delivery when concurrent open threads make it costly.
  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;
    let delay = 10_000;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      if (disposed) return;
      if (document.visibilityState === "visible" && navigator.onLine) {
        controller = new AbortController();
        try {
          const response = await fetch(`/api/threads/${thread.id}/updates`, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (response.status === 401 || response.status === 404) {
            router.refresh();
            return;
          }
          if (!response.ok) throw new Error("Unavailable");
          const { revision, closed } = await response.json();
          if (
            !disposed &&
            (revision !== thread.revision || closed !== thread.closed)
          ) {
            router.refresh();
          }
          delay = 10_000;
        } catch {
          delay = Math.min(delay * 2, 60_000);
        }
      }
      if (!disposed) timer = setTimeout(check, delay);
    }
    timer = setTimeout(check, delay);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [thread.id, thread.revision, thread.closed, router]);

  const send = async (body: string) => {
    // Same id for the optimistic bubble and the saved reply: React keeps the
    // node, so the rise animation isn't cut short when the server is fast.
    const text = body.trim();
    const id = unconfirmedReplies.current.get(text) ?? crypto.randomUUID();
    unconfirmedReplies.current.set(text, id);
    addReply({
      id,
      body,
      createdAt: new Date(),
      alias: thread.viewerAlias,
      university: { name: "", slug: null },
      isMine: true,
      isAuthor: thread.isMine,
      hidden: false,
      sending: true,
    });
    const result = await addComment(thread.id, body, id);
    // A lost acknowledgement retries the same publication, rather than duplicating it.
    unconfirmedReplies.current.delete(text);
    if (!result.ok) toast.error(result.error);
    else if (thread.historical)
      router.push(
        threadHref(
          `/p/${thread.id}#reply-${id}`,
          search.get("from") ?? "/campus",
        ),
      );
    return result.ok;
  };

  const mine = thread.isMine;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-background/85 px-4 py-2.5 backdrop-blur-xl lg:px-6 lg:py-4">
        <BackButton />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{thread.title}</p>
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            {thread.participantCount}{" "}
            {thread.participantCount === 1 ? "student" : "students"} ·{" "}
            {topicLabel(thread.topic)}
            {thread.audience === "CAMPUS" && (
              <>
                {" "}
                · <Lock className="size-3" /> Campus only
              </>
            )}
          </p>
        </div>
        <PostMenu post={thread} />
      </header>

      <div className="wallpaper flex-1 px-4 pt-6 pb-10 lg:px-6">
        <article className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
          {!mine && <AliasAvatar alias={thread.alias} className="mt-6" />}
          <div
            className={cn("flex min-w-0 flex-1 flex-col", mine && "items-end")}
          >
            <div className="mb-1.5 flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 text-[13px] text-muted">
              {mine ? (
                <span className="font-semibold text-ink">You</span>
              ) : (
                <AliasName alias={thread.alias} className="shrink-0" />
              )}
              <span aria-hidden>·</span>
              {thread.staff && thread.university.name !== "Canteen team" && (
                <span className="font-semibold">Canteen team · </span>
              )}
              <UniversityLabel university={thread.university} />
              <span aria-hidden>·</span>
              <TimeAgo date={thread.createdAt} className="shrink-0" />
            </div>
            <div
              className={cn(
                "w-full rounded-[26px] px-5 pt-4 pb-2.5",
                mine
                  ? "rounded-tr-md bg-you text-you-ink"
                  : "rounded-tl-md bg-surface shadow-soft ring-1 ring-line",
              )}
            >
              {thread.hidden && (
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold">
                  <ShieldAlert className="size-4" /> Hidden from others. Only
                  you can see it.
                </p>
              )}
              {thread.kind === "QUESTION" && (
                <p className="mb-2 text-[12px] font-semibold">
                  {thread.helpfulCommentId ? (
                    <>
                      <Check aria-hidden className="inline size-3.5" /> A reply
                      helped the author
                    </>
                  ) : (
                    "Question · waiting for a helpful reply"
                  )}
                </p>
              )}
              <h1 className="text-[22px] leading-tight font-bold tracking-tight text-balance sm:text-[26px]">
                {thread.title}
              </h1>
              {thread.body && (
                <div className="mt-3 text-[16px] leading-relaxed break-words whitespace-pre-wrap">
                  <Linkified text={thread.body} />
                </div>
              )}
              {thread.applicationUrl && thread.deadline && (
                <div className="mt-4 rounded-2xl p-3 ring-1 ring-current/15">
                  <p className="text-[13px] font-semibold">
                    {thread.closed ? "Applications closed" : "Apply before"} ·{" "}
                    <DateTime date={thread.deadline} /> · your local time
                  </p>
                  <a
                    href={thread.applicationUrl}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-background"
                  >
                    {thread.closed
                      ? "View original opportunity"
                      : "Open application"}
                    <ArrowUpRight aria-hidden className="size-4" />
                  </a>
                  <p className="mt-2 text-[12px]">
                    Shared by a student. Check details with the organizer.
                  </p>
                </div>
              )}
              {thread.poll && (
                <PollView
                  postId={thread.id}
                  poll={thread.poll}
                  onYellow={mine}
                />
              )}
              {thread.image && (
                <PostImage
                  image={thread.image}
                  alt={thread.image.alt}
                  priority
                />
              )}
              <div className="-mx-2 mt-3 flex items-center gap-1">
                <span
                  className={cn(
                    "ml-2 shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
                    mine
                      ? "bg-you-ink/10"
                      : "bg-surface-2 text-muted ring-1 ring-line",
                  )}
                >
                  {topicLabel(thread.topic)}
                </span>
                <span className="flex-1" />
                <LikeButton
                  key={`${thread.liked}:${thread.likeCount}`}
                  postId={thread.id}
                  liked={thread.liked}
                  count={thread.likeCount}
                  onYellow={mine}
                />
                <span
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 text-[13px] font-semibold tabular",
                    mine ? "text-you-muted" : "text-muted",
                  )}
                  aria-label={`${thread.viewCount} views`}
                >
                  <Eye className="size-[18px]" />{" "}
                  {compactNumber(thread.viewCount)}
                </span>
              </div>
            </div>
          </div>
        </article>

        {thread.topic === "MENTAL_HEALTH" && (
          <HelplineNote className="mx-auto mt-6 max-w-xl" />
        )}

        {thread.helpfulReply && (
          <section
            aria-label="Helpful answer"
            className="mt-6 rounded-2xl bg-surface p-4 ring-1 ring-line"
          >
            <h2 className="text-[14px] font-semibold">
              <Check aria-hidden className="mr-1 inline size-4" /> Marked
              helpful by the author
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              <AliasName alias={thread.helpfulReply.alias} />
              {" · "}
              <UniversityLabel university={thread.helpfulReply.university} />
            </p>
            <div className="mt-2 text-[15px] break-words whitespace-pre-wrap">
              <Linkified text={thread.helpfulReply.body} />
            </div>
            <ThreadLink
              href={`/p/${thread.id}?reply=${thread.helpfulReply.id}#reply-${thread.helpfulReply.id}`}
              className="mt-3 inline-block text-[13px] font-semibold underline"
            >
              Read in conversation
            </ThreadLink>
          </section>
        )}
        <div className="my-8 flex items-center gap-3 text-[12px] font-semibold text-muted">
          <span className="h-px flex-1 bg-line" />
          {replies.length === 0
            ? "No replies yet. Say something kind."
            : `${thread.commentCount} ${thread.commentCount === 1 ? "reply" : "replies"}`}
          <span className="h-px flex-1 bg-line" />
        </div>

        <nav
          aria-label="Reply pages"
          className="mb-4 flex justify-center gap-3"
        >
          {thread.earlierCursor && (
            <Button asChild variant="ghost">
              <ThreadLink
                href={`/p/${thread.id}?before=${encodeURIComponent(thread.earlierCursor)}`}
                scroll={false}
              >
                Earlier replies
              </ThreadLink>
            </Button>
          )}
          {thread.historical && (
            <Button asChild variant="ghost">
              <ThreadLink href={`/p/${thread.id}`} scroll={false}>
                Latest replies
              </ThreadLink>
            </Button>
          )}
        </nav>
        <div role="list" aria-label="Replies">
          {replies.map((reply, index) => {
            const previous = replies[index - 1];
            const next = replies[index + 1];
            const sameAsPrevious =
              previous?.alias.name === reply.alias.name &&
              previous.alias.hue === reply.alias.hue &&
              previous.isMine === reply.isMine &&
              reply.createdAt.getTime() - previous.createdAt.getTime() <
                GROUP_WINDOW_MS;
            const sameAsNext =
              next?.alias.name === reply.alias.name &&
              next.alias.hue === reply.alias.hue &&
              next.isMine === reply.isMine &&
              next.createdAt.getTime() - reply.createdAt.getTime() <
                GROUP_WINDOW_MS;
            return (
              <div
                role="listitem"
                key={reply.id}
                id={`reply-${reply.id}`}
                className="scroll-mt-24"
              >
                <ReplyBubble
                  reply={reply}
                  grouped={sameAsPrevious}
                  lastInGroup={!sameAsNext}
                />
                <HelpfulReply thread={thread} reply={reply} />
              </div>
            );
          })}
        </div>
      </div>

      <ReplyBar thread={thread} onSend={send} />
    </div>
  );
}
