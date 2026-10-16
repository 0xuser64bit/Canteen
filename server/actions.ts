"use server";

import { del, put } from "@vercel/blob";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { NotificationType, Topic } from "@/lib/generated/prisma/enums";
import { preparePostImage } from "@/lib/images";
import { getViewer, type Viewer } from "@/lib/session";
import { topicBySlug } from "@/lib/topics";
import { findUniversityByEmail } from "@/lib/universities";
import {
  commentInput,
  DELETE_CONFIRMATION,
  feedInput,
  idInput,
  likeInput,
  LIMITS,
  moderationInput,
  pollVoteInput,
  postInput,
  reportInput,
} from "@/lib/validation";
import * as queries from "@/server/queries";

export type ActionResult<T = null> =
  { ok: true; data: T } | { ok: false; error: string };

const SIGNED_OUT = {
  ok: false,
  error: "Your session ended. Sign in again to continue.",
} as const;
const NOT_FOUND = {
  ok: false,
  error: "That post isn't available anymore.",
} as const;

/** Distinct reports after which content disappears pending review. */
const HIDE_AFTER_REPORTS = 3;

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

async function postVisibleTo(viewer: Viewer, postId: string) {
  return db.post.findFirst({
    where: { id: postId, ...queries.visibleTo(viewer) },
    select: { id: true, authorId: true },
  });
}

async function postingTooFast(kind: "post" | "comment", authorId: string) {
  const window = {
    post: { max: 5, ms: 15 * 60_000 },
    comment: { max: 20, ms: 10 * 60_000 },
  }[kind];
  const where = {
    authorId,
    createdAt: { gte: new Date(Date.now() - window.ms) },
  };
  const recent =
    kind === "post"
      ? await db.post.count({ where })
      : await db.comment.count({ where });
  return recent >= window.max;
}

// One unread notification per post and kind; repeat events bump it to the top.
async function notify(userId: string, postId: string, type: NotificationType) {
  const unread = await db.notification.findFirst({
    where: { userId, postId, type, readAt: null },
    select: { id: true },
  });
  if (unread) {
    await db.notification.update({
      where: { id: unread.id },
      data: { createdAt: new Date() },
    });
  } else {
    await db.notification.create({ data: { userId, postId, type } });
  }
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export type ComposeState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"title" | "body" | "topic" | "audience" | "image" | "poll", string>
  >;
} | null;

export async function createPost(
  _: ComposeState,
  form: FormData,
): Promise<ComposeState> {
  const viewer = await getViewer();
  if (!viewer) return { error: SIGNED_OUT.error };
  if (!(form instanceof FormData))
    return { error: "That post didn't go through. Try again." };

  const choices = form.getAll("pollChoice");
  const parsed = postInput.safeParse({
    title: form.get("title"),
    body: form.get("body"),
    topic: form.get("topic"),
    audience: form.get("audience"),
    poll: choices.length > 0 ? choices : undefined,
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<ComposeState>["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof typeof fieldErrors;
      fieldErrors[field] ??= issue.message;
    }
    return { fieldErrors };
  }

  if (await postingTooFast("post", viewer.id)) {
    return {
      error:
        "You're posting quickly. Take a breather and try again in a few minutes.",
    };
  }

  let imageUrl: string | null = null;
  let imageWidth: number | null = null;
  let imageHeight: number | null = null;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        fieldErrors: { image: "Image uploads aren't enabled on this server." },
      };
    }
    if (image.size > LIMITS.imageBytes) {
      return {
        fieldErrors: { image: "That image is over 4 MB. Try a smaller one." },
      };
    }
    let prepared: Awaited<ReturnType<typeof preparePostImage>>;
    try {
      prepared = await preparePostImage(Buffer.from(await image.arrayBuffer()));
    } catch {
      return {
        fieldErrors: {
          image:
            "We couldn't read that image. Use a JPEG, PNG, or WebP under 25 megapixels.",
        },
      };
    }
    if (prepared.data.length > LIMITS.imageBytes)
      return {
        fieldErrors: {
          image: "That image is too large even after compressing.",
        },
      };
    try {
      const blob = await put(
        `posts/${crypto.randomUUID()}.webp`,
        prepared.data,
        {
          access: "public",
          contentType: "image/webp",
        },
      );
      imageUrl = blob.url;
      imageWidth = prepared.info.width;
      imageHeight = prepared.info.height;
    } catch {
      console.error("Post image upload failed");
      return {
        fieldErrors: {
          image: "We couldn't upload that image. Try again in a minute.",
        },
      };
    }
  }

  const { poll, ...fields } = parsed.data;
  let post: { id: string };
  try {
    post = await db.post.create({
      data: {
        ...fields,
        pollOptions: poll && {
          create: poll.map((label, position) => ({ label, position })),
        },
        imageUrl,
        imageWidth,
        imageHeight,
        authorId: viewer.id,
        universityId: viewer.university.id,
      },
      select: { id: true },
    });
  } catch {
    console.error("Post creation failed");
    if (imageUrl) {
      try {
        await del(imageUrl);
      } catch {
        // shortcut: cleanup failures are logged; add durable retries before scaling uploads.
        console.error("Unused post image cleanup failed");
      }
    }
    return { error: "We couldn't save your post. Try again in a minute." };
  }
  redirect(`/p/${post.id}`);
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!idInput.safeParse(postId).success) return NOT_FOUND;
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, imageUrl: true },
  });
  if (!post || post.authorId !== viewer.id) return NOT_FOUND;

  await db.post.delete({ where: { id: postId } });
  if (post.imageUrl) {
    const url = post.imageUrl;
    after(() => del(url));
  }
  return ok(null);
}

export async function setLike(
  postId: string,
  liked: boolean,
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!likeInput.safeParse({ postId, liked }).success) return NOT_FOUND;
  const post = await postVisibleTo(viewer, postId);
  if (!post) return NOT_FOUND;

  // Idempotent: double taps and retries can't double count.
  if (liked) {
    const { count } = await db.like.createMany({
      data: [{ userId: viewer.id, postId }],
      skipDuplicates: true,
    });
    if (count > 0 && post.authorId !== viewer.id) {
      after(() => notify(post.authorId, postId, "LIKE"));
    }
  } else {
    await db.like.deleteMany({ where: { userId: viewer.id, postId } });
  }
  return ok({ liked, likeCount: await db.like.count({ where: { postId } }) });
}

export async function votePoll(
  postId: string,
  optionId: string,
): Promise<ActionResult<queries.Poll>> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const parsed = pollVoteInput.safeParse({ postId, optionId });
  if (!parsed.success || !(await postVisibleTo(viewer, postId)))
    return NOT_FOUND;
  const option = await db.pollOption.findFirst({
    where: { id: optionId, postId },
    select: { id: true },
  });
  if (!option) return { ok: false, error: "That choice isn't in this poll." };

  // One vote per student; voting again moves it.
  await db.pollVote.upsert({
    where: { userId_postId: { userId: viewer.id, postId } },
    create: { userId: viewer.id, postId, optionId },
    update: { optionId },
  });
  const poll = await queries.getPoll(viewer, postId);
  return poll ? ok(poll) : NOT_FOUND;
}

export async function recordView(postId: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  if (!idInput.safeParse(postId).success) return;
  if (!(await postVisibleTo(viewer, postId))) return;
  await db.postView.createMany({
    data: [{ userId: viewer.id, postId }],
    skipDuplicates: true,
  });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function addComment(
  postId: string,
  body: string,
  id?: string,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;

  const parsed = commentInput.safeParse({ postId, body, id });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]!.message };

  const post = await postVisibleTo(viewer, postId);
  if (!post) return NOT_FOUND;
  if (await postingTooFast("comment", viewer.id)) {
    return {
      ok: false,
      error: "You're replying very quickly. Give it a minute.",
    };
  }

  try {
    await db.comment.create({
      data: {
        id: parsed.data.id,
        postId,
        body: parsed.data.body,
        authorId: viewer.id,
      },
    });
  } catch (error) {
    // P2002 is a reused client id; anything else is worth knowing about.
    const code = (error as { code?: string }).code;
    if (code !== "P2002") console.error("addComment failed", code ?? error);
    return { ok: false, error: "That reply didn't go through. Try again." };
  }
  if (post.authorId !== viewer.id)
    after(() => notify(post.authorId, postId, "COMMENT"));
  refresh();
  return ok(null);
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!idInput.safeParse(commentId).success) return NOT_FOUND;
  const { count } = await db.comment.deleteMany({
    where: { id: commentId, authorId: viewer.id },
  });
  if (count === 0)
    return { ok: false, error: "That reply isn't available anymore." };
  refresh();
  return ok(null);
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

export async function reportContent(input: {
  target: "post" | "comment";
  id: string;
  reason: string;
}): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const parsed = reportInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Pick a reason for the report." };
  const { target, id, reason } = parsed.data;

  const item =
    target === "post"
      ? await postVisibleTo(viewer, id)
      : await db.comment.findFirst({
          where: { id, hiddenAt: null, post: queries.visibleTo(viewer) },
          select: { authorId: true },
        });
  if (!item) return { ok: false, error: "That isn't available anymore." };
  if (item.authorId === viewer.id)
    return { ok: false, error: "You can delete your own content instead." };

  const key = target === "post" ? { postId: id } : { commentId: id };
  await db.report.createMany({
    data: [{ reporterId: viewer.id, reason, ...key }],
    skipDuplicates: true,
  });
  // Reports a moderator already reviewed don't count again, and the same
  // student can't report twice, so it takes new reporters to re-hide.
  const reports = await db.report.count({
    where: { ...key, resolvedAt: null },
  });
  if (reports >= HIDE_AFTER_REPORTS) {
    const hide = { where: { id }, data: { hiddenAt: new Date() } };
    if (target === "post") await db.post.update(hide);
    else await db.comment.update(hide);
  }
  return ok(null);
}

/**
 * Team only. Keep restores the content and closes its reports; remove deletes
 * it; ban also signs the author out for good and hides everything they wrote.
 */
export async function moderate(input: {
  target: "post" | "comment";
  id: string;
  decision: "keep" | "remove" | "ban";
}): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!queries.isModerator(viewer))
    return { ok: false, error: "Only the Canteen team can do that." };
  const parsed = moderationInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick an action." };
  const { target, id, decision } = parsed.data;

  const item =
    target === "post"
      ? await db.post.findUnique({
          where: { id },
          select: { authorId: true, imageUrl: true },
        })
      : await db.comment
          .findUnique({ where: { id }, select: { authorId: true } })
          .then((comment) => comment && { ...comment, imageUrl: null });
  if (!item) return { ok: false, error: "That isn't available anymore." };
  if (decision === "ban" && item.authorId === viewer.id)
    return { ok: false, error: "You can't ban your own account." };

  const now = new Date();
  const key = target === "post" ? { postId: id } : { commentId: id };
  if (decision === "keep") {
    const restore = { where: { id }, data: { hiddenAt: null } };
    await db.$transaction([
      target === "post" ? db.post.update(restore) : db.comment.update(restore),
      db.report.updateMany({
        where: { ...key, resolvedAt: null },
        data: { resolvedAt: now },
      }),
    ]);
  } else {
    // Its reports cascade with it.
    if (target === "post") await db.post.delete({ where: { id } });
    else await db.comment.delete({ where: { id } });
    if (item.imageUrl) {
      const url = item.imageUrl;
      after(() => del(url));
    }
  }

  if (decision === "ban") {
    const author = item.authorId;
    const theirs = { authorId: author, hiddenAt: null };
    await db.$transaction([
      db.user.update({ where: { id: author }, data: { bannedAt: now } }),
      db.session.deleteMany({ where: { userId: author } }),
      db.post.updateMany({ where: theirs, data: { hiddenAt: now } }),
      db.comment.updateMany({ where: theirs, data: { hiddenAt: now } }),
      // The ban settles every open report against them.
      db.report.updateMany({
        where: {
          resolvedAt: null,
          OR: [
            { post: { authorId: author } },
            { comment: { authorId: author } },
          ],
        },
        data: { resolvedAt: now },
      }),
    ]);
  }
  refresh();
  return ok(null);
}

// ---------------------------------------------------------------------------
// Feeds, search, notifications
// ---------------------------------------------------------------------------

export async function loadMore(input: {
  scope: "everyone" | "campus" | "mine" | `university:${string}`;
  topic?: string;
  cursor: string;
}): Promise<ActionResult<queries.FeedPage>> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const parsed = feedInput.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "That feed couldn't be loaded. Refresh and try again.",
    };
  const { scope: requestedScope, topic: requestedTopic, cursor } = parsed.data;

  let scope: queries.FeedScope;
  if (requestedScope.startsWith("university:")) {
    const page = await queries.getUniversityPage(
      viewer,
      requestedScope.slice("university:".length),
    );
    if (!page) return ok({ items: [], nextCursor: null });
    scope = { kind: "university", universityId: page.id };
  } else {
    scope = { kind: requestedScope as "everyone" | "campus" | "mine" };
  }
  const topic: Topic | undefined = topicBySlug(requestedTopic)?.id;
  return ok(await queries.getFeed(viewer, { scope, topic, cursor }));
}

export async function searchCanteen(
  query: string,
): Promise<queries.SearchResults> {
  const viewer = await getViewer();
  if (!viewer || typeof query !== "string")
    return { universities: [], posts: [] };
  return queries.search(viewer, query);
}

export async function markNotificationsRead(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  await db.notification.updateMany({
    where: { userId: viewer.id, readAt: null },
    data: { readAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

/** Public: tells someone signing up which university their email maps to. */
export async function lookupUniversity(
  email: string,
): Promise<{ name: string } | null> {
  if (typeof email !== "string") return null;
  const match = findUniversityByEmail(email.slice(0, 254));
  return match ? { name: match.name } : null;
}

export async function deleteAccount(
  confirmation: string,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (
    typeof confirmation !== "string" ||
    confirmation.trim().toLowerCase() !== DELETE_CONFIRMATION
  ) {
    return { ok: false, error: `Type "${DELETE_CONFIRMATION}" to confirm.` };
  }

  const images = await db.post.findMany({
    where: { authorId: viewer.id, imageUrl: { not: null } },
    select: { imageUrl: true },
  });
  await auth.api.signOut({ headers: await headers() });
  // Sessions, posts, replies, likes, views, reports, and notifications cascade.
  await db.user.delete({ where: { id: viewer.id } });
  const urls = images.map((row) => row.imageUrl!);
  if (urls.length > 0) after(() => del(urls));
  redirect("/?deleted=1");
}
