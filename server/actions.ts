"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { NotificationType, Topic } from "@/lib/generated/prisma/enums";
import { preparePostImage } from "@/lib/images";
import { getViewer, type Viewer } from "@/lib/session";
import { topicBySlug } from "@/lib/topics";
import { findUniversityByEmail } from "@/lib/universities";
import {
  commentInput,
  helpfulInput,
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
import {
  attachImage,
  stageImage,
  queueImageDeletion,
  processImageDeletions,
} from "@/server/media";

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
const POSTING_TOO_FAST =
  "You're posting quickly. Take a breather and try again in a few minutes.";

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

async function postVisibleTo(
  viewer: Viewer,
  postId: string,
  client: Prisma.TransactionClient = db,
) {
  return client.post.findFirst({
    where: { id: postId, ...queries.visibleTo(viewer) },
    select: { id: true, authorId: true },
  });
}

// Publishing and moderation take the same lock, so limits and bans hold in flight.
async function lockAuthor(tx: Prisma.TransactionClient, authorId: string) {
  const [author] = await tx.$queryRaw<{ bannedAt: Date | null }[]>`
    SELECT "bannedAt" FROM "User" WHERE "id" = ${authorId} FOR UPDATE
  `;
  return author;
}

async function postingTooFast(
  kind: "post" | "comment",
  authorId: string,
  client: Prisma.TransactionClient = db,
) {
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
      ? await client.post.count({ where })
      : await client.comment.count({ where });
  return recent >= window.max;
}

// One unread notification per post and kind; repeat events bump it to the top.
async function notify(userId: string, postId: string, type: NotificationType) {
  try {
    await db.$transaction(async (tx) => {
      const author = await lockAuthor(tx, userId);
      if (!author || author.bannedAt) return;
      const unread = await tx.notification.findFirst({
        where: { userId, postId, type, readAt: null },
        select: { id: true },
      });
      if (unread) {
        await tx.notification.update({
          where: { id: unread.id },
          data: { createdAt: new Date() },
        });
      } else {
        await tx.notification.create({ data: { userId, postId, type } });
      }
    });
  } catch {
    console.error("Notification delivery failed");
  }
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export type ComposeState = {
  error?: string;
  fieldErrors?: Partial<
    Record<
      "title" | "body" | "topic" | "audience" | "image" | "poll" | "kind",
      string
    >
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
    kind: form.get("kind") ?? undefined,
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
    return { error: POSTING_TOO_FAST };
  }

  let imageUrl: string | null = null;
  let imageIntent: string | null = null;
  let imageWidth: number | null = null;
  let imageHeight: number | null = null;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (!process.env.BLOB_PRIVATE_READ_WRITE_TOKEN) {
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
      const blob = await stageImage(prepared.data);
      imageUrl = blob.url;
      imageIntent = blob.intentId;
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
  let result: ActionResult<{ id: string }>;
  try {
    result = await db.$transaction(async (tx) => {
      const author = await lockAuthor(tx, viewer.id);
      if (!author || author.bannedAt) return SIGNED_OUT;
      if (await postingTooFast("post", viewer.id, tx))
        return { ok: false as const, error: POSTING_TOO_FAST };
      const post = await tx.post.create({
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
      if (imageIntent) await attachImage(tx, imageIntent);
      return ok(post);
    });
  } catch {
    console.error("Post creation failed");
    result = {
      ok: false,
      error: "We couldn't save your post. Try again in a minute.",
    };
  }
  if (!result.ok) {
    // The upload intent survives rollback; a committed post removes it atomically.
    return { error: result.error };
  }
  redirect(`/p/${result.data.id}`);
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

  await db.$transaction(async (tx) => {
    await tx.post.delete({ where: { id: postId } });
    if (post.imageUrl) await queueImageDeletion(tx, post.imageUrl);
  });
  if (post.imageUrl) after(processImageDeletions);
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

  let result: ActionResult<{ authorId: string }>;
  try {
    result = await db.$transaction(async (tx) => {
      const author = await lockAuthor(tx, viewer.id);
      if (!author || author.bannedAt) return SIGNED_OUT;
      const post = await postVisibleTo(viewer, postId, tx);
      if (!post) return NOT_FOUND;
      if (await postingTooFast("comment", viewer.id, tx))
        return {
          ok: false as const,
          error: "You're replying very quickly. Give it a minute.",
        };
      await tx.comment.create({
        data: {
          id: parsed.data.id,
          postId,
          body: parsed.data.body,
          authorId: viewer.id,
        },
      });
      return ok(post);
    });
  } catch (error) {
    // P2002 is a reused client id; anything else is worth knowing about.
    const code = (error as { code?: string } | null)?.code;
    if (code !== "P2002") console.error("addComment failed", code ?? "unknown");
    return { ok: false, error: "That reply didn't go through. Try again." };
  }
  if (!result.ok) return result;
  if (result.data.authorId !== viewer.id)
    after(() => notify(result.data.authorId, postId, "COMMENT"));
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
    else {
      await db.$transaction([
        db.comment.update(hide),
        db.helpfulAnswer.deleteMany({ where: { commentId: id } }),
      ]);
    }
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

  let result: ActionResult<string | null>;
  try {
    result = await db.$transaction(async (tx) => {
      const item =
        target === "post"
          ? await tx.post.findUnique({
              where: { id },
              select: { authorId: true, imageUrl: true },
            })
          : await tx.comment
              .findUnique({ where: { id }, select: { authorId: true } })
              .then((comment) => comment && { ...comment, imageUrl: null });
      if (!item) return NOT_FOUND;
      if (decision === "ban" && item.authorId === viewer.id)
        return { ok: false as const, error: "You can't ban your own account." };

      const author = await lockAuthor(tx, item.authorId);
      if (!author) return NOT_FOUND;
      if (decision === "keep" && author.bannedAt)
        return {
          ok: false as const,
          error: "Content from a banned account can't be restored.",
        };

      const now = new Date();
      const key = target === "post" ? { postId: id } : { commentId: id };
      if (decision === "keep") {
        const restore = { where: { id }, data: { hiddenAt: null } };
        const { count } =
          target === "post"
            ? await tx.post.updateMany(restore)
            : await tx.comment.updateMany(restore);
        if (count === 0) return NOT_FOUND;
        await tx.report.updateMany({
          where: { ...key, resolvedAt: null },
          data: { resolvedAt: now },
        });
      } else {
        const { count } =
          target === "post"
            ? await tx.post.deleteMany({ where: { id } })
            : await tx.comment.deleteMany({ where: { id } });
        if (count === 0) return NOT_FOUND;
      }

      if (decision === "ban") {
        const authorId = item.authorId;
        const theirs = { authorId, hiddenAt: null };
        await tx.user.update({
          where: { id: authorId },
          data: { bannedAt: now },
        });
        await tx.session.deleteMany({ where: { userId: authorId } });
        await tx.post.updateMany({ where: theirs, data: { hiddenAt: now } });
        await tx.comment.updateMany({ where: theirs, data: { hiddenAt: now } });
        await tx.helpfulAnswer.deleteMany({ where: { comment: { authorId } } });
        await tx.report.updateMany({
          where: {
            resolvedAt: null,
            OR: [{ post: { authorId } }, { comment: { authorId } }],
          },
          data: { resolvedAt: now },
        });
      }
      if (decision !== "keep" && item.imageUrl)
        await queueImageDeletion(tx, item.imageUrl);
      return ok(decision === "keep" ? null : item.imageUrl);
    });
  } catch {
    console.error("Moderation decision failed");
    return { ok: false, error: "That decision couldn't be saved. Try again." };
  }
  if (!result.ok) return result;
  const imageUrl = result.data;
  if (imageUrl) after(processImageDeletions);
  refresh();
  return ok(null);
}

export async function markHelpful(
  postId: string,
  commentId: string | null,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!helpfulInput.safeParse({ postId, commentId }).success) return NOT_FOUND;
  const result = await db.$transaction(async (tx) => {
    const author = await lockAuthor(tx, viewer.id);
    if (!author || author.bannedAt) return SIGNED_OUT;
    const post = await tx.post.findFirst({
      where: {
        id: postId,
        authorId: viewer.id,
        hiddenAt: null,
        kind: "QUESTION",
      },
      select: { id: true },
    });
    if (!post) return NOT_FOUND;
    if (commentId === null) {
      await tx.helpfulAnswer.deleteMany({ where: { postId } });
    } else {
      const comment = await tx.comment.findFirst({
        where: {
          id: commentId,
          postId,
          hiddenAt: null,
          authorId: { not: viewer.id },
        },
        select: { id: true },
      });
      if (!comment) return NOT_FOUND;
      await tx.helpfulAnswer.upsert({
        where: { postId },
        create: { postId, commentId },
        update: { commentId, createdAt: new Date() },
      });
    }
    return ok(null);
  });
  if (result.ok) refresh();
  return result;
}

// ---------------------------------------------------------------------------
// Feeds, search, notifications
// ---------------------------------------------------------------------------

export async function loadMore(input: {
  scope: "everyone" | "campus" | "mine" | `university:${string}`;
  topic?: string;
  unanswered?: boolean;
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
  return ok(
    await queries.getFeed(viewer, {
      scope,
      topic,
      cursor,
      unanswered: parsed.data.unanswered,
    }),
  );
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
  await db.$transaction(async (tx) => {
    const author = await lockAuthor(tx, viewer.id);
    if (!author || author.bannedAt) return;
    await tx.notification.updateMany({
      where: { userId: viewer.id, readAt: null },
      data: { readAt: new Date() },
    });
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

  await auth.api.signOut({ headers: await headers() });
  await db.$transaction(async (tx) => {
    await lockAuthor(tx, viewer.id);
    const images = await tx.post.findMany({
      where: { authorId: viewer.id, imageUrl: { not: null } },
      select: { imageUrl: true },
    });
    for (const image of images) await queueImageDeletion(tx, image.imageUrl!);
    await tx.user.delete({ where: { id: viewer.id } });
  });
  after(processImageDeletions);
  redirect("/?deleted=1");
}
