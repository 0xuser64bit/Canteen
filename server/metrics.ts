import "server-only";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/session";
import { TEAM } from "@/lib/universities";
import { isModerator } from "@/server/queries";

export async function recordActivity(viewer: Viewer) {
  const day = new Date(new Date().toISOString().slice(0, 10));
  try {
    await db.dailyActivity.createMany({
      data: [{ userId: viewer.id, day }],
      skipDuplicates: true,
    });
  } catch {
    // Activity measurement must not take down the student experience.
    console.error("Daily activity could not be recorded");
  }
}

const suppress = (count: number) => (count < 5 ? null : count);

export async function getLaunchMetrics(viewer: Viewer) {
  if (!isModerator(viewer)) return null;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const week = new Date(today.getTime() - 6 * 86400000);
  const rows = await db.$queryRaw<
    {
      name: string;
      members: bigint;
      active: bigint;
      helped: bigint;
      eligible: bigint;
      returned: bigint;
    }[]
  >`
    WITH members AS (SELECT "id", "universityId", "createdAt" FROM "User" WHERE "bannedAt" IS NULL),
    tracking AS (SELECT MIN("day") AS started FROM "DailyActivity")
    SELECT u."name", COUNT(m."id") AS members,
      (SELECT COUNT(DISTINCT d."userId") FROM "DailyActivity" d JOIN members a ON a."id" = d."userId"
        WHERE a."universityId" = u."id" AND d."day" >= ${week}) AS active,
      (SELECT COUNT(DISTINCT p."authorId") FROM "HelpfulAnswer" h JOIN "Post" p ON p."id" = h."postId"
        JOIN members a ON a."id" = p."authorId" WHERE p."universityId" = u."id"
        AND p."hiddenAt" IS NULL AND h."createdAt" >= ${week}) AS helped,
      (SELECT COUNT(*) FROM members a CROSS JOIN tracking t WHERE a."universityId" = u."id"
        AND (a."createdAt" AT TIME ZONE 'UTC')::date >= t.started
        AND (a."createdAt" AT TIME ZONE 'UTC')::date >= ${today}::date - 42
        AND (a."createdAt" AT TIME ZONE 'UTC')::date <= ${today}::date - 14) AS eligible,
      (SELECT COUNT(*) FROM members a CROSS JOIN tracking t WHERE a."universityId" = u."id"
        AND (a."createdAt" AT TIME ZONE 'UTC')::date >= t.started
        AND (a."createdAt" AT TIME ZONE 'UTC')::date >= ${today}::date - 42
        AND (a."createdAt" AT TIME ZONE 'UTC')::date <= ${today}::date - 14
        AND EXISTS (SELECT 1 FROM "DailyActivity" d WHERE d."userId" = a."id"
          AND d."day" >= (a."createdAt" AT TIME ZONE 'UTC')::date + 7
          AND d."day" < (a."createdAt" AT TIME ZONE 'UTC')::date + 14)) AS returned
    FROM "University" u JOIN members m ON m."universityId" = u."id"
    WHERE u."slug" <> ${TEAM.slug}
    GROUP BY u."id" HAVING COUNT(m."id") >= 5 ORDER BY COUNT(m."id") DESC, u."name"
  `;
  return rows.map((row) => {
    const eligible = Number(row.eligible);
    const returned = Number(row.returned);
    // Suppress the complement too, so a rate cannot expose a tiny non-returning group.
    const returnRate =
      eligible >= 5 &&
      returned >= 5 &&
      (eligible === returned || eligible - returned >= 5)
        ? Math.round((100 * returned) / eligible)
        : null;
    return {
      name: row.name,
      members: Number(row.members),
      active: suppress(Number(row.active)),
      helped: suppress(Number(row.helped)),
      returnRate,
    };
  });
}
