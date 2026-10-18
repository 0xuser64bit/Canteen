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
  const startedAt = new Date();
  await db.maintenance.upsert({
    where: { id: "scheduled" },
    create: { id: "scheduled", startedAt },
    update: { startedAt },
  });
  try {
    await db.dailyActivity.deleteMany({
      where: { day: { lt: new Date(Date.now() - 90 * 86400000) } },
    });
    await db.publication.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
    });
    await db.universityRequest.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 90 * 86400000) } },
    });
    let processed = 0;
    const started = Date.now();
    // Drain bounded batches within the route budget; slow storage leaves leases for retry.
    for (let batch = 0; batch < 4 && Date.now() - started < 25_000; batch++) {
      const count = await processImageDeletions();
      processed += count;
      if (count < 10) break;
    }
    const migrated = await migrateLegacyImages();
    await db.rateLimit.deleteMany({
      where: { lastRequest: { lt: BigInt(Date.now() - 24 * 60 * 60_000) } },
    });
    await db.signInBudget.deleteMany({
      where: { windowStart: { lt: new Date(Date.now() - 60 * 60_000) } },
    });
    // Better Auth removes an expired session or code only when it is presented
    // again; abandoned ones would otherwise stay until the account is erased.
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.verification.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    await db.suspendedEmail.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    await db.maintenance.update({
      where: { id: "scheduled" },
      data: { succeededAt: new Date() },
    });
    return Response.json(
      { processed, migrated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    await db.maintenance.update({
      where: { id: "scheduled" },
      data: { failedAt: new Date() },
    });
    console.error("Scheduled maintenance failed");
    return Response.json(
      {
        error:
          "Maintenance did not finish. Retry and check operational status.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
