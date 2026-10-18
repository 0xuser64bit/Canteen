"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { campusHostDomains } from "@/lib/campus-hosts";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { NotificationType, Topic } from "@/lib/generated/prisma/enums";
import { preparePostImage } from "@/lib/images";
import {
  keyedHash,
  SUSPENSION_MEMORY_MS,
  suspendedEmailKey,
} from "@/lib/pseudonym";
import {
  getViewer,
  getAccountViewer,
  getDraftOwner,
  type Viewer,
} from "@/lib/session";
import { topicBySlug } from "@/lib/topics";
import { findUniversityByEmail, TEAM } from "@/lib/universities";
import {
  appealInput,
  reviewAppealInput,
  collectionInput,
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
import { alertTeam } from "@/server/alerts";
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
    select: {
      id: true,
      authorId: true,
      audience: true,
      universityId: true,
      university: { select: { domain: true } },
    },
  });
}

// Serialize publishing and bans without blocking foreign-key checks from reply alerts.
async function lockAuthor(tx: Prisma.TransactionClient, authorId: string) {
  const [author] = await tx.$queryRaw<{ bannedAt: Date | null }[]>`
    SELECT "bannedAt" FROM "User" WHERE "id" = ${authorId} FOR NO KEY UPDATE
  `;
  return author;
}

async function postingTooFast(
  kind: "post" | "comment" | "upload",
  authorId: string,
  client: Prisma.TransactionClient = db,
) {
  const window = {
    post: { max: 5, ms: 15 * 60_000 },
    comment: { max: 20, ms: 10 * 60_000 },
    upload: { max: 5, ms: 15 * 60_000 },
  }[kind];
  const where = {
    userId: authorId,
    kind: { post: "POST", comment: "COMMENT", upload: "UPLOAD" }[kind] as
      "POST" | "COMMENT" | "UPLOAD",
    createdAt: { gte: new Date(Date.now() - window.ms) },
  };
  const recent = await client.publication.count({ where });
  return recent >= window.max;
}

// Transactional and coalesced; advisory locks avoid locking another student's account.
async function notify(
  tx: Prisma.TransactionClient,
  userId: string,
  postId: string,
  type: NotificationType,
  replyId?: string,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`notification:${userId}`}, 0))::text`;
  const user = await tx.user.findUnique({
    where: { id: userId, bannedAt: null },
    select: { id: true },
  });
  if (!user) return;
  const unread = await tx.notification.findFirst({
    where: { userId, postId, type, readAt: null },
    select: { id: true },
  });
  if (unread)
    await tx.notification.update({
      where: { id: unread.id },
      data: { createdAt: new Date(), revision: { increment: 1 }, replyId },
    });
  else
    await tx.notification.create({ data: { userId, postId, type, replyId } });
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export type ComposeState = {
  postedId?: string;
  error?: string;
  fieldErrors?: Partial<
    Record<
      | "title"
      | "body"
      | "topic"
      | "audience"
      | "image"
      | "imageAlt"
      | "poll"
      | "kind"
      | "applicationUrl"
      | "deadline",
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
  const draftOwner = form.get("draftOwner");
  if (draftOwner !== null && draftOwner !== (await getDraftOwner()))
    return {
      error: "Your session changed. Refresh before publishing this draft.",
    };

  const hostSlug = form.get("hostCampus");
  const hostCampus =
    typeof hostSlug === "string"
      ? viewer.hostCampuses?.find((campus) => campus.slug === hostSlug)
      : undefined;
  if (hostSlug && !hostCampus)
    return {
      error:
        "That campus assignment is no longer available. Refresh and try again.",
    };

  const choices = form.getAll("pollChoice");
  const parsed = postInput.safeParse({
    id: form.get("id") ?? undefined,
    imageAlt: form.get("imageAlt") ?? undefined,
    title: form.get("title"),
    body: form.get("body"),
    topic: form.get("topic"),
    audience: form.get("audience"),
    kind: form.get("kind") ?? undefined,
    applicationUrl: form.get("applicationUrl") ?? undefined,
    deadline: form.get("deadline") ?? undefined,
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

  if (parsed.data.id) {
    const existing = await db.post.findFirst({
      where: { id: parsed.data.id, authorId: viewer.id },
      select: { id: true },
    });
    if (existing) return { postedId: existing.id };
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
    if (!parsed.data.imageAlt)
      return {
        fieldErrors: {
          imageAlt: "Describe the important information in this image.",
        },
      };
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
    const admitted = await db.$transaction(async (tx) => {
      const author = await lockAuthor(tx, viewer.id);
      if (
        !author ||
        author.bannedAt ||
        (await postingTooFast("upload", viewer.id, tx))
      )
        return false;
      await tx.publication.create({
        data: { userId: viewer.id, kind: "UPLOAD" },
      });
      return true;
    });
    if (!admitted)
      return {
        error:
          "You've tried several image uploads. Wait a few minutes before trying another.",
      };
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
      if (fields.id) {
        const existing = await tx.post.findFirst({
          where: { id: fields.id, authorId: viewer.id },
          select: { id: true },
        });
        if (existing) return ok(existing);
      }
      if (await postingTooFast("post", viewer.id, tx))
        return { ok: false as const, error: POSTING_TOO_FAST };
      const post = await tx.post.create({
        data: {
          ...fields,
          deadline: fields.deadline ? new Date(fields.deadline) : null,
          pollOptions: poll && {
            create: poll.map((label, position) => ({ label, position })),
          },
          imageUrl,
          imageWidth,
          imageHeight,
          authorId: viewer.id,
          universityId: hostCampus?.id ?? viewer.university.id,
        },
        select: { id: true },
      });
      if (imageIntent) await attachImage(tx, imageIntent);
      await tx.publication.create({
        data: { userId: viewer.id, kind: "POST" },
      });
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
  refresh();
  return { postedId: result.data.id };
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!idInput.safeParse(postId).success) return NOT_FOUND;
  const result = await db.$transaction(async (tx) => {
    const author = await lockAuthor(tx, viewer.id);
    if (!author || author.bannedAt) return SIGNED_OUT;
    const post = await tx.post.findFirst({
      where: { id: postId, authorId: viewer.id },
      select: { id: true },
    });
    if (!post) return NOT_FOUND;
    const removed = await tx.post.delete({
      where: { id: postId },
      select: { imageUrl: true },
    });
    if (removed.imageUrl) await queueImageDeletion(tx, removed.imageUrl);
    return ok(Boolean(removed.imageUrl));
  });
  if (!result.ok) return result;
  if (result.data) after(processImageDeletions);
  return ok(null);
}

export async function setLike(
  postId: string,
  liked: boolean,
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!likeInput.safeParse({ postId, liked }).success) return NOT_FOUND;
  const result = await db.$transaction(async (tx) => {
    const author = await lockAuthor(tx, viewer.id);
    if (!author || author.bannedAt) return SIGNED_OUT;
    const post = await postVisibleTo(viewer, postId, tx);
    if (!post) return NOT_FOUND;
    await tx.post.update({
      where: { id: postId },
      data: { revision: { increment: 1 } },
    });
    if (liked) {
      const { count } = await tx.like.createMany({
        data: [{ userId: viewer.id, postId }],
        skipDuplicates: true,
      });
      if (count && post.authorId !== viewer.id)
        await notify(tx, post.authorId, postId, "LIKE");
    } else await tx.like.deleteMany({ where: { userId: viewer.id, postId } });
    return ok({ liked, likeCount: await tx.like.count({ where: { postId } }) });
  });
  if (result.ok) refresh();
  return result;
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
  await db.$transaction(async (tx) => {
    await tx.pollVote.upsert({
      where: { userId_postId: { userId: viewer.id, postId } },
      create: { userId: viewer.id, postId, optionId },
      update: { optionId },
    });
    await tx.post.update({
      where: { id: postId },
      data: { revision: { increment: 1 } },
    });
  });
  const poll = await queries.getPoll(viewer, postId);
  refresh();
  return poll ? ok(poll) : NOT_FOUND;
}

export async function recordView(postId: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  if (!idInput.safeParse(postId).success) return;
  if (!(await postVisibleTo(viewer, postId))) return;
  // Counts each student once without storing who read what.
  await db.postView.createMany({
    data: [{ postId, viewer: keyedHash(`view:${viewer.id}:${postId}`) }],
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
      const comment = await tx.comment.create({
        data: {
          id: parsed.data.id,
          postId,
          body: parsed.data.body,
          authorId: viewer.id,
        },
      });
      await tx.publication.create({
        data: { userId: viewer.id, kind: "COMMENT" },
      });
      await tx.post.update({
        where: { id: postId },
        data: { revision: { increment: 1 } },
      });
      const recipients = await tx.user.findMany({
        where: {
          id: { not: viewer.id },
          bannedAt: null,
          AND: [
            { OR: [{ id: post.authorId }, { follows: { some: { postId } } }] },
          ],
          ...(post.audience === "CAMPUS"
            ? {
                OR: [
                  { universityId: post.universityId },
                  { university: { slug: TEAM.slug } },
                ],
              }
            : {}),
        },
        select: { id: true, email: true, universityId: true },
        orderBy: { id: "asc" },
      });
      for (const recipient of recipients) {
        if (
          post.audience === "CAMPUS" &&
          recipient.universityId !== post.universityId &&
          !campusHostDomains(recipient.email).includes(post.university.domain)
        )
          continue;
        await notify(tx, recipient.id, postId, "COMMENT", comment.id);
      }
      return ok(post);
    });
  } catch (error) {
    // P2002 is a reused client id; anything else is worth knowing about.
    const code = (error as { code?: string } | null)?.code;
    if (code !== "P2002") console.error("addComment failed", code ?? "unknown");
    return { ok: false, error: "That reply didn't go through. Try again." };
  }
  if (!result.ok) return result;
  refresh();
  return ok(null);
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!idInput.safeParse(commentId).success) return NOT_FOUND;
  const result = await db.$transaction(async (tx) => {
    const comment = await tx.comment.findFirst({
      where: { id: commentId, authorId: viewer.id },
      select: { postId: true },
    });
    if (!comment) return NOT_FOUND;
    await tx.comment.delete({ where: { id: commentId } });
    await tx.post.update({
      where: { id: comment.postId },
      data: { revision: { increment: 1 } },
    });
    return ok(null);
  });
  if (!result.ok) return result;
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
          select: { authorId: true, postId: true },
        });
  if (!item) return { ok: false, error: "That isn't available anymore." };
  if (item.authorId === viewer.id)
    return { ok: false, error: "You can delete your own content instead." };

  const result = await db.$transaction(async (tx) => {
    // Match moderation's author lock; sorted acquisition also covers reporter suspension.
    const authors = await tx.$queryRaw<{ id: string; bannedAt: Date | null }[]>`
      SELECT "id", "bannedAt" FROM "User" WHERE "id" IN (${viewer.id}, ${item.authorId}) ORDER BY "id" FOR NO KEY UPDATE
    `;
    if (!authors.some((author) => author.id === viewer.id && !author.bannedAt))
      return SIGNED_OUT;
    if (
      !authors.some((author) => author.id === item.authorId && !author.bannedAt)
    )
      return NOT_FOUND;
    const current =
      target === "post"
        ? await postVisibleTo(viewer, id, tx)
        : await tx.comment.findFirst({
            where: { id, hiddenAt: null, post: queries.visibleTo(viewer) },
            select: { postId: true },
          });
    if (!current) return NOT_FOUND;
    const key = target === "post" ? { postId: id } : { commentId: id };
    const { count: created } = await tx.report.createMany({
      data: [{ reporterId: viewer.id, reason, ...key }],
      skipDuplicates: true,
    });
    const reports = await tx.report.count({
      where: { ...key, resolvedAt: null },
    });
    // Only the first open at-risk report on an item pages the team.
    const atRisk =
      created === 1 &&
      reason === "SELF_HARM" &&
      (await tx.report.count({
        where: { ...key, resolvedAt: null, reason: "SELF_HARM" },
      })) === 1;
    const hidden = reports >= HIDE_AFTER_REPORTS;
    if (hidden) {
      if (target === "post") {
        await tx.post.update({
          where: { id },
          data: { hiddenAt: new Date(), revision: { increment: 1 } },
        });
      } else {
        await tx.comment.update({
          where: { id },
          data: { hiddenAt: new Date() },
        });
        await tx.helpfulAnswer.deleteMany({ where: { commentId: id } });
        await tx.post.update({
          where: { id: "postId" in current ? current.postId : id },
          data: { revision: { increment: 1 } },
        });
      }
    }
    return ok({ atRisk, hidden });
  });
  if (!result.ok) return result;
  if (result.data.atRisk)
    after(() =>
      alertTeam(
        "A report says someone may be at risk. Please review it now.",
        "/mod",
      ),
    );
  else if (result.data.hidden)
    after(() =>
      alertTeam(
        "Reports hid a post or reply. It stays hidden until the team decides.",
        "/mod",
      ),
    );
  return ok(null);
}

/** Decisions preserve the content for its author's appeal; author deletion still erases it. */
export async function moderate(input: {
  target: "post" | "comment";
  id: string;
  decision: "keep" | "remove" | "ban";
  reason?: string;
}): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!queries.isModerator(viewer))
    return { ok: false, error: "Only the Canteen team can do that." };
  const parsed = moderationInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Pick an action and reason." };
  const { target, id, decision, reason } = parsed.data;
  try {
    const result = await db.$transaction(async (tx) => {
      const found =
        target === "post"
          ? await tx.post.findUnique({
              where: { id },
              select: { authorId: true },
            })
          : await tx.comment.findUnique({
              where: { id },
              select: { authorId: true },
            });
      if (!found) return NOT_FOUND;
      if (decision === "ban" && found.authorId === viewer.id)
        return { ok: false as const, error: "You can't ban your own account." };
      const author = await lockAuthor(tx, found.authorId);
      if (!author) return NOT_FOUND;
      if (author.bannedAt && decision !== "remove")
        return {
          ok: false as const,
          error: "Review the suspension appeal before restoring this account.",
        };
      const item =
        target === "post"
          ? await tx.post.findUnique({
              where: { id },
              select: { removedAt: true },
            })
          : await tx.comment.findUnique({
              where: { id },
              select: { removedAt: true },
            });
      if (!item || (item.removedAt && decision !== "keep")) return NOT_FOUND;
      const now = new Date();
      const key = target === "post" ? { postId: id } : { commentId: id };
      const data = {
        hiddenAt: decision === "keep" ? null : now,
        removedAt: decision === "keep" ? null : now,
      };
      if (target === "post")
        await tx.post.update({
          where: { id },
          data: { ...data, revision: { increment: 1 } },
        });
      else {
        const comment = await tx.comment.update({
          where: { id },
          data,
          select: { postId: true },
        });
        if (decision !== "keep")
          await tx.helpfulAnswer.deleteMany({ where: { commentId: id } });
        await tx.post.update({
          where: { id: comment.postId },
          data: { revision: { increment: 1 } },
        });
      }
      await tx.report.updateMany({
        where: { ...key, resolvedAt: null },
        data: { resolvedAt: now },
      });
      await tx.moderationCase.create({
        data: {
          ...key,
          authorId: found.authorId,
          decision:
            decision === "keep"
              ? "KEEP"
              : decision === "remove"
                ? "REMOVE"
                : "BAN",
          reason,
          createdAt: now,
        },
      });
      if (decision === "ban") {
        const authorId = found.authorId;
        await tx.user.update({
          where: { id: authorId },
          data: { bannedAt: now },
        });
        await tx.session.deleteMany({ where: { userId: authorId } });
        await tx.post.updateMany({
          where: { authorId, hiddenAt: null },
          data: { hiddenAt: now, revision: { increment: 1 } },
        });
        await tx.post.updateMany({
          where: { comments: { some: { authorId } } },
          data: { revision: { increment: 1 } },
        });
        await tx.comment.updateMany({
          where: { authorId, hiddenAt: null },
          data: { hiddenAt: now },
        });
        await tx.helpfulAnswer.deleteMany({ where: { comment: { authorId } } });
        await tx.report.updateMany({
          where: {
            resolvedAt: null,
            OR: [{ post: { authorId } }, { comment: { authorId } }],
          },
          data: { resolvedAt: now },
        });
      }
      return ok(null);
    });
    if (result.ok) refresh();
    return result;
  } catch {
    console.error("Moderation decision failed");
    return { ok: false, error: "That decision couldn't be saved. Try again." };
  }
}

export async function submitAppeal(
  id: string,
  body: string,
): Promise<ActionResult> {
  const viewer = await getAccountViewer();
  if (!viewer) return SIGNED_OUT;
  const parsed = appealInput.safeParse({ id, body });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]!.message };
  const { count } = await db.moderationCase.updateMany({
    where: {
      id,
      authorId: viewer.id,
      decision: { not: "KEEP" },
      appealedAt: null,
    },
    data: { appealText: parsed.data.body, appealedAt: new Date() },
  });
  if (!count)
    return {
      ok: false,
      error: "That decision is unavailable or already appealed.",
    };
  after(() => alertTeam("An appeal is waiting for a decision.", "/mod"));
  refresh();
  return ok(null);
}

export async function reviewAppeal(
  id: string,
  restore: boolean,
  response: string,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!queries.isModerator(viewer))
    return { ok: false, error: "Only the Canteen team can do that." };
  const parsed = reviewAppealInput.safeParse({ id, restore, response });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]!.message };
  const result = await db.$transaction(async (tx) => {
    const found = await tx.moderationCase.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!found) return NOT_FOUND;
    if (found.authorId === viewer.id)
      return {
        ok: false as const,
        error: "Another team member must review your appeal.",
      };
    const author = await lockAuthor(tx, found.authorId);
    const item = await tx.moderationCase.findFirst({
      where: { id, appealedAt: { not: null }, resolvedAt: null },
    });
    if (!item || !author) return NOT_FOUND;
    if (restore) {
      if (
        author.bannedAt &&
        (item.decision !== "BAN" ||
          author.bannedAt.getTime() !== item.createdAt.getTime())
      )
        return {
          ok: false as const,
          error: "A newer suspension must be reviewed first.",
        };
      const target = item.postId
        ? await tx.post.findUnique({
            where: { id: item.postId },
            select: { removedAt: true },
          })
        : item.commentId
          ? await tx.comment.findUnique({
              where: { id: item.commentId },
              select: { removedAt: true },
            })
          : null;
      if (
        target &&
        (!target.removedAt ||
          target.removedAt.getTime() !== item.createdAt.getTime())
      )
        return {
          ok: false as const,
          error:
            "This content has a newer decision. Uphold this appeal and review the latest one.",
        };
      if (item.decision === "BAN") {
        await tx.user.update({
          where: { id: found.authorId },
          data: { bannedAt: null },
        });
        // Restore only content hidden by this suspension, preserving independent reports/decisions.
        await tx.post.updateMany({
          where: {
            authorId: found.authorId,
            hiddenAt: item.createdAt,
            removedAt: null,
          },
          data: { hiddenAt: null, revision: { increment: 1 } },
        });
        await tx.comment.updateMany({
          where: {
            authorId: found.authorId,
            hiddenAt: item.createdAt,
            removedAt: null,
          },
          data: { hiddenAt: null },
        });
      }
      if (item.postId)
        await tx.post.update({
          where: { id: item.postId },
          data: { hiddenAt: null, removedAt: null, revision: { increment: 1 } },
        });
      else if (item.commentId)
        await tx.comment.update({
          where: { id: item.commentId },
          data: { hiddenAt: null, removedAt: null },
        });
      await tx.post.updateMany({
        where: { comments: { some: { authorId: found.authorId } } },
        data: { revision: { increment: 1 } },
      });
    }
    await tx.moderationCase.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        restored: restore,
        response: parsed.data.response,
      },
    });
    return ok(null);
  });
  if (result.ok) refresh();
  return result;
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
    await tx.post.update({
      where: { id: postId },
      data: { revision: { increment: 1 } },
    });
    return ok(null);
  });
  if (result.ok) refresh();
  return result;
}

// ---------------------------------------------------------------------------
// Feeds, search, notifications
// ---------------------------------------------------------------------------

export async function loadMore(input: {
  scope:
    | "everyone"
    | "campus"
    | "mine"
    | "saved"
    | "following"
    | `university:${string}`;
  topic?: string;
  unanswered?: boolean;
  noReplies?: boolean;
  sort?: queries.FeedSort;
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
    scope = {
      kind: requestedScope as
        "everyone" | "campus" | "mine" | "saved" | "following",
    };
  }
  const topic: Topic | undefined = topicBySlug(requestedTopic)?.id;
  return ok(
    await queries.getFeed(viewer, {
      scope,
      topic,
      cursor,
      unanswered: parsed.data.unanswered,
      noReplies: parsed.data.noReplies,
      sort: parsed.data.sort,
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

export async function markNotificationsRead(
  delivered: { id: string; revision: number }[],
): Promise<void> {
  const viewer = await getViewer();
  if (
    !viewer ||
    !Array.isArray(delivered) ||
    delivered.length === 0 ||
    delivered.length > 50 ||
    delivered.some(
      (item) =>
        !item ||
        !idInput.safeParse(item.id).success ||
        !Number.isSafeInteger(item.revision) ||
        item.revision < 0,
    )
  )
    return;
  await db.$transaction(async (tx) => {
    const author = await lockAuthor(tx, viewer.id);
    if (!author || author.bannedAt) return;
    // Coordinate with notify's read-then-update coalescing, not just its revision.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`notification:${viewer.id}`}, 0))::text`;
    await tx.notification.updateMany({
      where: {
        OR: delivered.map(({ id, revision }) => ({ id, revision })),
        userId: viewer.id,
        readAt: null,
        post: queries.visibleTo(viewer),
      },
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
  const viewer = await getAccountViewer();
  if (!viewer) return SIGNED_OUT;
  if (
    typeof confirmation !== "string" ||
    confirmation.trim().toLowerCase() !== DELETE_CONFIRMATION
  ) {
    return { ok: false, error: `Type "${DELETE_CONFIRMATION}" to confirm.` };
  }

  await db.$transaction(async (tx) => {
    const account = await lockAuthor(tx, viewer.id);
    // Erasure can't be used to rejoin unsuspended: only a keyed hash of the
    // email outlives a suspended account, until the block expires.
    if (account?.bannedAt) {
      const expiresAt = new Date(Date.now() + SUSPENSION_MEMORY_MS);
      await tx.suspendedEmail.upsert({
        where: { hash: suspendedEmailKey(viewer.email) },
        create: { hash: suspendedEmailKey(viewer.email), expiresAt },
        update: { expiresAt },
      });
    }
    // Lock owned and replied-to posts together, in one order, before media snapshots
    // and revision updates. Two students erasing cross-replies cannot invert this order.
    await tx.$queryRaw`SELECT "id" FROM "Post" WHERE "authorId" = ${viewer.id}
      OR EXISTS (SELECT 1 FROM "Comment" WHERE "Comment"."postId" = "Post"."id" AND "Comment"."authorId" = ${viewer.id})
      ORDER BY "id" FOR UPDATE`;
    const images = await tx.post.findMany({
      where: { authorId: viewer.id, imageUrl: { not: null } },
      select: { imageUrl: true },
    });
    for (const image of images) await queueImageDeletion(tx, image.imageUrl!);
    await tx.post.updateMany({
      where: { comments: { some: { authorId: viewer.id } } },
      data: { revision: { increment: 1 } },
    });
    await tx.user.delete({ where: { id: viewer.id } });
  });
  after(processImageDeletions);
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // The account and all sessions are already erased. Let the client clear drafts.
    console.error("Account erased; session cookie cleanup failed");
  }
  return ok(null);
}

export async function setCollection(
  postId: string,
  collection: "saved" | "following",
  enabled: boolean,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!collectionInput.safeParse({ postId, collection, enabled }).success)
    return NOT_FOUND;
  const result = await db.$transaction(async (tx) => {
    const author = await lockAuthor(tx, viewer.id);
    if (!author || author.bannedAt) return SIGNED_OUT;
    // Removing a private reference still works after its post becomes inaccessible.
    if (enabled && !(await postVisibleTo(viewer, postId, tx))) return NOT_FOUND;
    const data = { userId: viewer.id, postId };
    if (collection === "saved") {
      if (enabled)
        await tx.bookmark.createMany({ data: [data], skipDuplicates: true });
      else await tx.bookmark.deleteMany({ where: data });
    } else {
      if (enabled)
        await tx.follow.createMany({ data: [data], skipDuplicates: true });
      else await tx.follow.deleteMany({ where: data });
    }
    return ok(null);
  });
  if (result.ok) refresh();
  return result;
}

export async function loadEarlierReplies(
  postId: string,
  cursor: string,
): Promise<ActionResult<queries.CommentPage>> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (
    !idInput.safeParse(postId).success ||
    typeof cursor !== "string" ||
    cursor.length > 128
  )
    return NOT_FOUND;
  const page = await queries.getComments(viewer, postId, cursor);
  return page ? ok(page) : NOT_FOUND;
}
