"use client";

import { Eye, Heart, Lock, MessageCircle, ShieldAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { AliasAvatar, AliasName } from "@/components/alias";
import { PollView } from "@/components/poll";
import { PostMenu } from "@/components/post-menu";
import { Deadline, Edited, TimeAgo } from "@/components/time";
import { ThreadLink } from "@/components/thread-link";
import { topicLabel } from "@/lib/topics";
import { cn, compactNumber } from "@/lib/utils";
import { setLike } from "@/server/actions";
import type { PostSummary, PublicUniversity } from "@/server/queries";

export function UniversityLabel({
  university,
  className,
}: {
  university: PublicUniversity;
  className?: string;
}) {
  if (!university.slug)
    return (
      <span title={university.name} className={cn("truncate", className)}>
        {university.name}
      </span>
    );
  return (
    <Link
      href={`/u/${university.slug}`}
      title={university.name}
      className={cn("relative z-10 truncate hover:underline", className)}
    >
      {university.name}
    </Link>
  );
}

export function LikeButton({
  postId,
  liked: initialLiked,
  count: initialCount,
  onYellow,
}: {
  postId: string;
  liked: boolean;
  count: number;
  onYellow?: boolean;
}) {
  const source = { liked: initialLiked, count: initialCount };
  const [confirmed, setConfirmed] = useState({ source, value: source });
  if (
    confirmed.source.liked !== initialLiked ||
    confirmed.source.count !== initialCount
  )
    setConfirmed({ source, value: source });
  const [state, choose] = useOptimistic(
    confirmed.value,
    (current, liked: boolean) => ({
      liked,
      count: current.count + (Number(liked) - Number(current.liked)),
    }),
  );
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    if (pending) return;
    const liked = !state.liked;
    startTransition(async () => {
      choose(liked);
      try {
        const result = await setLike(postId, liked);
        if (!result.ok) toast.error(result.error);
        else
          setConfirmed((current) => ({
            ...current,
            value: { liked: result.data.liked, count: result.data.likeCount },
          }));
      } catch {
        toast.error("That like didn't go through. Try again.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={state.liked}
      aria-label={state.liked ? "Unlike" : "Like"}
      className={cn(
        "relative z-10 flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold tabular transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        onYellow
          ? "hover:bg-you-surface-ink/10"
          : "text-muted hover:bg-surface-3 hover:text-ink",
        state.liked && !onYellow && "text-danger hover:text-danger",
      )}
    >
      <Heart
        key={String(state.liked)}
        className={cn(
          "size-[18px]",
          state.liked && "animate-heart-pop fill-current",
        )}
      />
      {state.count > 0 && compactNumber(state.count)}
    </button>
  );
}

function Meta({ post, onYellow }: { post: PostSummary; onYellow: boolean }) {
  const quiet = onYellow ? "text-you-surface-muted" : "text-muted";
  return (
    <div className="relative z-10 mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "mr-1 shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
            onYellow
              ? "bg-you-surface-ink/10"
              : "bg-surface-2 text-muted ring-1 ring-line",
          )}
        >
          {topicLabel(post.topic)}
        </span>
        {post.deadline && (
          <Deadline
            date={post.deadline}
            className={cn("text-[12px] font-semibold", quiet)}
            urgentClassName={onYellow ? "text-you-surface-ink" : "text-ink"}
          />
        )}
        {post.kind === "QUESTION" && (
          <span className={cn("text-[12px] font-semibold", quiet)}>
            {post.helpfulCommentId ? "Answered" : "Question"}
          </span>
        )}
        {post.audience === "CAMPUS" && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 text-[12px] font-semibold whitespace-nowrap",
              quiet,
            )}
            title="Visible to this university and explicitly assigned Canteen hosts; moderators can review reports"
          >
            <Lock className="size-3.5" /> Campus
          </span>
        )}
        {post.editedAt && (
          <Edited
            date={post.editedAt}
            className={cn("text-[12px] font-semibold capitalize", quiet)}
          />
        )}
      </div>
      <div className="-mx-1.5 mt-1 flex items-center justify-end gap-1">
        <LikeButton
          postId={post.id}
          liked={post.liked}
          count={post.likeCount}
          onYellow={onYellow}
        />
        <ThreadLink
          href={`/p/${post.id}`}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold tabular transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11",
            onYellow
              ? "hover:bg-you-surface-ink/10"
              : "text-muted hover:bg-surface-3 hover:text-ink",
          )}
          aria-label={`${post.commentCount} ${post.commentCount === 1 ? "reply" : "replies"}`}
        >
          <MessageCircle className="size-[18px]" />
          {post.commentCount > 0 && compactNumber(post.commentCount)}
        </ThreadLink>
        <span
          className={cn(
            "hidden items-center gap-1.5 px-2 text-[13px] font-semibold tabular sm:flex",
            quiet,
          )}
          aria-label={`${post.viewCount} views`}
        >
          <Eye className="size-[18px]" />
          {compactNumber(post.viewCount)}
        </span>
        <PostMenu post={post} onYellow={onYellow} />
      </div>
    </div>
  );
}

export function PostImage({
  image,
  alt,
  priority,
  className,
}: {
  image: NonNullable<PostSummary["image"]>;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      unoptimized
      src={image.url}
      width={image.width}
      height={image.height}
      alt={alt}
      priority={priority}
      sizes="(min-width: 1024px) 600px, 100vw"
      className={cn(
        "mt-3 h-auto w-full rounded-2xl bg-surface-3 object-cover",
        className,
      )}
    />
  );
}

/** A post in a feed, drawn as a message: yours on the right in yellow, everyone else's on the left. */
export function PostCard({
  post,
  priority,
}: {
  post: PostSummary;
  priority?: boolean;
}) {
  const mine = post.isMine;
  return (
    <article className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
      {!mine && (
        <AliasAvatar alias={post.alias} className="mt-6 hidden sm:grid" />
      )}
      <div
        className={cn(
          "flex w-[88%] min-w-0 flex-col sm:w-[82%]",
          mine && "items-end",
        )}
      >
        <div className="mb-1.5 flex max-w-full items-center gap-1.5 px-1 text-[13px] text-muted">
          {mine ? (
            <span className="shrink-0 font-semibold text-ink">You</span>
          ) : (
            <AliasName alias={post.alias} className="shrink-0" />
          )}
          <span aria-hidden>·</span>
          {post.staff && post.university.name !== "Canteen team" && (
            <span className="shrink-0 font-semibold">Canteen team · </span>
          )}
          <UniversityLabel university={post.university} />
          <span aria-hidden>·</span>
          <TimeAgo date={post.createdAt} className="shrink-0" />
        </div>
        <div
          className={cn(
            "group/bubble relative w-full rounded-[24px] px-4 pt-3.5 pb-2 transition-[box-shadow,transform] duration-200 has-[a.stretched:hover]:shadow-pop",
            mine
              ? "rounded-tr-md bg-you-surface text-you-surface-ink"
              : "rounded-tl-md bg-surface shadow-soft ring-1 ring-line",
          )}
        >
          {post.hidden && (
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold">
              <ShieldAlert className="size-4" /> Hidden from others. Only you
              can see it.
            </p>
          )}
          <h2 className="text-[17px] leading-snug font-semibold tracking-tight text-pretty">
            <ThreadLink
              href={`/p/${post.id}`}
              className="stretched after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
            >
              {post.title}
            </ThreadLink>
          </h2>
          {post.excerpt && (
            <p
              className={cn(
                "mt-1 line-clamp-4 text-[15px] leading-relaxed whitespace-pre-line",
                mine ? "text-you-surface-ink" : "text-ink/85",
              )}
            >
              {post.excerpt}
            </p>
          )}
          {post.poll && (
            <PollView postId={post.id} poll={post.poll} onYellow={mine} />
          )}
          {post.image && (
            <PostImage
              image={post.image}
              alt={post.image.alt}
              priority={priority}
              className="max-h-[420px]"
            />
          )}
          <Meta post={post} onYellow={mine} />
        </div>
      </div>
    </article>
  );
}

export function PostCardSkeleton({ mine }: { mine?: boolean }) {
  return (
    <div className={cn("flex gap-2.5", mine && "flex-row-reverse")} aria-hidden>
      {!mine && (
        <span className="mt-6 hidden size-9 shrink-0 rounded-full bg-surface-3 sm:block" />
      )}
      <div
        className={cn(
          "flex w-[88%] flex-col gap-2 sm:w-[82%]",
          mine && "items-end",
        )}
      >
        <span className="h-3.5 w-48 rounded-full bg-surface-3" />
        <div
          className={cn(
            "h-32 w-full animate-pulse rounded-[24px] bg-surface-3/70",
            mine ? "rounded-tr-md" : "rounded-tl-md",
          )}
        />
      </div>
    </div>
  );
}
