"use client";

import { ArrowLeft, ArrowUp, Eye, Lock, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import { AliasAvatar, AliasName } from "@/components/alias";
import { Linkified } from "@/components/linkified";
import { LikeButton, PostImage, UniversityLabel } from "@/components/post";
import { CommentMenu, PostMenu } from "@/components/post-menu";
import { TimeAgo } from "@/components/time";
import { Counter } from "@/components/ui/field";
import { topicLabel } from "@/lib/topics";
import { cn, compactNumber } from "@/lib/utils";
import { LIMITS } from "@/lib/validation";
import { addComment, recordView } from "@/server/actions";
import type { Thread, ThreadComment } from "@/server/queries";

type Reply = ThreadComment & { sending?: boolean };

const GROUP_WINDOW_MS = 10 * 60_000;

function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => {
        const cameFromHere =
          document.referrer &&
          new URL(document.referrer).origin === location.origin;
        if (cameFromHere && history.length > 1) router.back();
        else router.push("/home");
      }}
      className="-ml-2 grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors hover:bg-surface-3"
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
  return (
    <div
      className={cn(
        "group/reply flex items-end gap-2",
        mine && "flex-row-reverse",
        grouped ? "mt-1" : "mt-4",
        reply.sending && "animate-bubble-pop",
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
              <ShieldAlert className="size-3.5" /> Hidden after reports. Only
              you can see it.
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

function ReplyBar({
  thread,
  onSend,
}: {
  thread: Thread;
  onSend: (body: string) => Promise<boolean>;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const empty = body.trim().length === 0;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (empty || pending || body.length > LIMITS.comment.max) return;
    const text = body;
    setBody("");
    startTransition(async () => {
      if (!(await onSend(text))) setBody(text);
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
      ref={form}
      onSubmit={submit}
      className="sticky bottom-0 z-20 border-t border-line bg-background/90 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:px-6"
    >
      <div className="flex items-end gap-2 rounded-[26px] bg-surface p-1.5 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-ink dark:focus-within:ring-you">
        <label htmlFor="reply" className="sr-only">
          Reply
        </label>
        <textarea
          id="reply"
          rows={1}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a reply"
          maxLength={LIMITS.comment.max + 200}
          className="[field-sizing:content] max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] leading-relaxed outline-none placeholder:text-muted"
        />
        <span className="self-center">
          <Counter value={body.length} max={LIMITS.comment.max} />
        </span>
        <button
          type="submit"
          disabled={empty || body.length > LIMITS.comment.max}
          aria-label="Send reply"
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-you text-you-ink transition-[transform,opacity] duration-150 active:scale-90 disabled:cursor-default disabled:opacity-40"
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
  const end = useRef<HTMLDivElement>(null);
  const [replies, addReply] = useOptimistic<Reply[], Reply>(
    thread.comments,
    (current, reply) => [...current, reply],
  );

  useEffect(() => {
    recordView(thread.id);
  }, [thread.id]);

  const send = async (body: string) => {
    addReply({
      id: `sending-${Date.now()}`,
      body,
      createdAt: new Date(),
      alias: thread.viewerAlias,
      university: { name: "", slug: null },
      isMine: true,
      isAuthor: thread.isMine,
      hidden: false,
      sending: true,
    });
    requestAnimationFrame(() =>
      end.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
    const result = await addComment(thread.id, body);
    if (!result.ok) toast.error(result.error);
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
            <div className="mb-1.5 flex max-w-full items-center gap-1.5 px-1 text-[13px] text-muted">
              {mine ? (
                <span className="font-semibold text-ink">You</span>
              ) : (
                <AliasName alias={thread.alias} className="shrink-0" />
              )}
              <span aria-hidden>·</span>
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
                  <ShieldAlert className="size-4" /> Hidden after reports. Only
                  you can see it.
                </p>
              )}
              <h1 className="text-[22px] leading-tight font-bold tracking-tight text-balance sm:text-[26px]">
                {thread.title}
              </h1>
              <div className="mt-3 text-[16px] leading-relaxed break-words whitespace-pre-wrap">
                <Linkified text={thread.body} />
              </div>
              {thread.image && (
                <PostImage image={thread.image} alt="" priority />
              )}
              <div className="-mx-2 mt-3 flex items-center gap-1">
                <span
                  className={cn(
                    "ml-2 rounded-full px-2.5 py-1 text-[12px] font-semibold",
                    mine
                      ? "bg-you-ink/10"
                      : "bg-surface-2 text-muted ring-1 ring-line",
                  )}
                >
                  {topicLabel(thread.topic)}
                </span>
                <span className="flex-1" />
                <LikeButton
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

        <div className="my-8 flex items-center gap-3 text-[12px] font-semibold text-muted">
          <span className="h-px flex-1 bg-line" />
          {replies.length === 0
            ? "No replies yet. Say something kind."
            : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
          <span className="h-px flex-1 bg-line" />
        </div>

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
              <div role="listitem" key={reply.id}>
                <ReplyBubble
                  reply={reply}
                  grouped={sameAsPrevious}
                  lastInGroup={!sameAsNext}
                />
              </div>
            );
          })}
        </div>
        <div ref={end} />
      </div>

      <ReplyBar thread={thread} onSend={send} />
    </div>
  );
}
