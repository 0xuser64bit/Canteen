import "server-only";
import { del, get, put } from "@vercel/blob";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { preparePostImage } from "@/lib/images";

const ORPHAN_DELAY = 60 * 60_000;
const LEASE_MS = 5 * 60_000;

export function blobToken(key: string) {
  const legacy =
    key.startsWith("https://") &&
    new URL(key).hostname.endsWith(".public.blob.vercel-storage.com");
  const token = legacy
    ? process.env.BLOB_READ_WRITE_TOKEN
    : process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
  if (!token) throw new Error("Image storage is not configured");
  return { token, access: legacy ? ("public" as const) : ("private" as const) };
}

export async function stageImage(bytes: Buffer) {
  const token = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
  if (!token) throw new Error("Private image storage is not configured");
  const key = `posts/${crypto.randomUUID()}.webp`;
  const intent = await db.blobDeletion.create({
    data: { key, dueAt: new Date(Date.now() + ORPHAN_DELAY) },
  });
  const blob = await put(key, bytes, {
    access: "private",
    token,
    contentType: "image/webp",
    addRandomSuffix: false,
    abortSignal: AbortSignal.timeout(20_000),
  });
  return { url: blob.url, intentId: intent.id };
}

export async function attachImage(
  tx: Prisma.TransactionClient,
  intentId: string,
) {
  const { count } = await tx.blobDeletion.deleteMany({
    where: { id: intentId, attempts: 0 },
  });
  if (count !== 1) throw new Error("Image upload expired");
}

export function queueImageDeletion(tx: Prisma.TransactionClient, key: string) {
  return tx.blobDeletion.upsert({
    where: { key },
    create: { key },
    update: { dueAt: new Date() },
  });
}

/** Claim before external work; an expired lease lets a later invocation recover a crash. */
export async function processImageDeletions() {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LEASE_MS);
  const jobs = await db.$queryRaw<
    { id: string; key: string; attempts: number }[]
  >`
    UPDATE "BlobDeletion" SET "lockedUntil" = ${lockedUntil}, "attempts" = "attempts" + 1
    WHERE "id" IN (
      SELECT "id" FROM "BlobDeletion"
      WHERE "dueAt" <= ${now} AND ("lockedUntil" IS NULL OR "lockedUntil" <= ${now})
      ORDER BY "dueAt", "id" LIMIT 10 FOR UPDATE SKIP LOCKED
    ) RETURNING "id", "key", "attempts"
  `;
  await Promise.all(
    jobs.map(async (job) => {
      const where = { id: job.id, lockedUntil };
      try {
        await del(job.key, {
          token: blobToken(job.key).token,
          abortSignal: AbortSignal.timeout(10_000),
        });
        await db.blobDeletion.deleteMany({ where });
      } catch {
        const delay = Math.min(
          60_000 * 2 ** Math.min(job.attempts - 1, 11),
          24 * 60 * 60_000,
        );
        await db.blobDeletion.updateMany({
          where,
          data: { lockedUntil: null, dueAt: new Date(Date.now() + delay) },
        });
        console.error("Image deletion will be retried");
      }
    }),
  );
  return jobs.length;
}

/** Copy first, then swap the reference and queue erasure in one transaction. */
export async function migrateLegacyImages() {
  if (
    !process.env.BLOB_PRIVATE_READ_WRITE_TOKEN ||
    !process.env.BLOB_READ_WRITE_TOKEN
  )
    return 0;
  const posts = await db.post.findMany({
    where: { imageUrl: { contains: ".public.blob.vercel-storage.com/" } },
    select: { id: true, imageUrl: true },
    take: 1,
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
  });
  let migrated = 0;
  for (const post of posts) {
    const oldUrl = post.imageUrl!;
    try {
      const source = await get(oldUrl, {
        ...blobToken(oldUrl),
        useCache: false,
        abortSignal: AbortSignal.timeout(10_000),
      });
      if (!source || source.statusCode !== 200)
        throw new Error("Legacy image unavailable");
      const bytes = Buffer.from(
        await new Response(source.stream).arrayBuffer(),
      );
      const prepared = await preparePostImage(bytes);
      const image = await stageImage(prepared.data);
      migrated += await db.$transaction(async (tx) => {
        const { count } = await tx.post.updateMany({
          where: { id: post.id, imageUrl: oldUrl },
          data: {
            imageUrl: image.url,
            imageWidth: prepared.info.width,
            imageHeight: prepared.info.height,
          },
        });
        if (count === 0) return 0;
        await attachImage(tx, image.intentId);
        await queueImageDeletion(tx, oldUrl);
        return 1;
      });
    } catch {
      // Rotate failed files so one damaged legacy upload cannot block the migration.
      await db.post.updateMany({
        where: { id: post.id, imageUrl: oldUrl },
        data: { updatedAt: new Date() },
      });
      console.error("Legacy image migration will be retried");
    }
  }
  return migrated;
}
