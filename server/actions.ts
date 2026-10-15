"use server";

import { del, put } from "@vercel/blob";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { NotificationType, Topic } from "@/lib/generated/prisma/enums";
import { getViewer, type Viewer } from "@/lib/session";
import { topicBySlug } from "@/lib/topics";
import { findUniversityByEmail } from "@/lib/universities";
import {
  commentInput,
  DELETE_CONFIRMATION,
  LIMITS,
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
    where: {
      id: postId,
      hiddenAt: null,
      OR: [{ audience: "EVERYONE" }, { universityId: viewer.university.id }],
    },
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

function sniffImage(bytes: Buffer) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { type: "image/jpeg", ext: "jpg" };
  }
  const ascii = (from: number, to: number) =>
    bytes.toString("latin1", from, to);
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP")
    return { type: "image/webp", ext: "webp" };
  return null;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export type ComposeState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"title" | "body" | "topic" | "audience" | "image", string>
  >;
} | null;

export async function createPost(
  _: ComposeState,
  form: FormData,
): Promise<ComposeState> {
  const viewer = await getViewer();
  if (!viewer) return { error: SIGNED_OUT.error };

  const parsed = postInput.safeParse({
    title: form.get("title"),
    body: form.get("body"),
    topic: form.get("topic"),
    audience: form.get("audience"),
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
  const dimension = (key: string) => {
    const value = Number(form.get(key));
    return Number.isInteger(value) && value > 0 && value <= 10_000
      ? value
      : null;
  };
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
    const bytes = Buffer.from(await image.arrayBuffer());
    // The composer re-encodes every image in the browser (stripping location
    // data) to JPEG or WebP; anything else did not come from our client.
    const kind = sniffImage(bytes);
    if (!kind)
      return { fieldErrors: { image: "Use a JPEG, PNG, or WebP image." } };
    const blob = await put(`posts/${crypto.randomUUID()}.${kind.ext}`, bytes, {
      access: "public",
      contentType: kind.type,
    });
    imageUrl = blob.url;
  }

  const post = await db.post.create({
    data: {
      ...parsed.data,
      imageUrl,
      imageWidth: imageUrl ? dimension("imageWidth") : null,
      imageHeight: imageUrl ? dimension("imageHeight") : null,
      authorId: viewer.id,
      universityId: viewer.university.id,
    },
    select: { id: true },
  });
  redirect(`/p/${post.id}`);
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
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

export async function recordView(postId: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
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
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;

  const parsed = commentInput.safeParse({ postId, body });
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

  await db.comment.create({
    data: { postId, body: parsed.data.body, authorId: viewer.id },
  });
  if (post.authorId !== viewer.id)
    after(() => notify(post.authorId, postId, "COMMENT"));
  refresh();
  return ok(null);
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
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
          where: { id, hiddenAt: null, post: { hiddenAt: null } },
          select: {
            authorId: true,
            post: { select: { audience: true, universityId: true } },
          },
        });
  if (!item) return { ok: false, error: "That isn't available anymore." };
  if (
    "post" in item &&
    item.post.audience === "CAMPUS" &&
    item.post.universityId !== viewer.university.id
  ) {
    return { ok: false, error: "That isn't available anymore." };
  }
  if (item.authorId === viewer.id)
    return { ok: false, error: "You can delete your own content instead." };

  const key = target === "post" ? { postId: id } : { commentId: id };
  await db.report.createMany({
    data: [{ reporterId: viewer.id, reason, ...key }],
    skipDuplicates: true,
  });
  const reports = await db.report.count({ where: key });
  if (reports >= HIDE_AFTER_REPORTS) {
    const hide = { where: { id }, data: { hiddenAt: new Date() } };
    if (target === "post") await db.post.update(hide);
    else await db.comment.update(hide);
  }
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

  let scope: queries.FeedScope;
  if (input.scope.startsWith("university:")) {
    const page = await queries.getUniversityPage(
      viewer,
      input.scope.slice("university:".length),
    );
    if (!page) return ok({ items: [], nextCursor: null });
    scope = { kind: "university", universityId: page.id };
  } else {
    scope = { kind: input.scope as "everyone" | "campus" | "mine" };
  }
  const topic: Topic | undefined = topicBySlug(input.topic)?.id;
  return ok(
    await queries.getFeed(viewer, { scope, topic, cursor: input.cursor }),
  );
}

export async function searchCanteen(
  query: string,
): Promise<queries.SearchResults> {
  const viewer = await getViewer();
  if (!viewer) return { universities: [], posts: [] };
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
  const match = findUniversityByEmail(String(email).slice(0, 254));
  return match ? { name: match.name } : null;
}

export async function deleteAccount(
  confirmation: string,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (confirmation.trim().toLowerCase() !== DELETE_CONFIRMATION) {
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
