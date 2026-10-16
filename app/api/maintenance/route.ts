import { db } from "@/lib/db";
import { timingSafeEqual } from "node:crypto";
import { migrateLegacyImages, processImageDeletions } from "@/server/media";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (
    !secret ||
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return new Response(null, { status: 401 });
  }
  await db.dailyActivity.deleteMany({
    where: { day: { lt: new Date(Date.now() - 90 * 86400000) } },
  });
  const processed = await processImageDeletions();
  const migrated = await migrateLegacyImages();
  return Response.json(
    { processed, migrated },
    { headers: { "Cache-Control": "no-store" } },
  );
}
