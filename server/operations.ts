import "server-only";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/session";
import { isModerator, visibleTo } from "@/server/queries";

/** A daily run plus slack: past this, maintenance counts as stale. */
export const MAINTENANCE_STALE_MS = 26 * 60 * 60_000;

/** Host-only waiting totals; small question groups are suppressed. */
export async function getWaitingSummary(viewer: Viewer, universityId: string) {
  if (
    !isModerator(viewer) ||
    !viewer.hostCampuses?.some((campus) => campus.id === universityId)
  )
    return null;
  const where = {
    AND: [
      visibleTo(viewer),
      { universityId, kind: "QUESTION" as const, helpfulAnswer: null },
    ],
  };
  const [count, oldest] = await Promise.all([
    db.post.count({ where }),
    db.post.findFirst({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { createdAt: true },
    }),
  ]);
  return count >= 5 && oldest ? { count, oldest: oldest.createdAt } : null;
}

export async function getOperations(viewer: Viewer) {
  if (!isModerator(viewer)) return null;
  const now = new Date();
  const [
    maintenance,
    due,
    oldest,
    retrying,
    reports,
    domainRequests,
    appeals,
    oldestReport,
    oldestAppeal,
  ] = await Promise.all([
    db.maintenance.findUnique({ where: { id: "scheduled" } }),
    db.blobDeletion.count({ where: { dueAt: { lte: now } } }),
    db.blobDeletion.findFirst({
      where: { dueAt: { lte: now } },
      orderBy: { dueAt: "asc" },
      select: { dueAt: true },
    }),
    db.blobDeletion.count({ where: { attempts: { gt: 0 } } }),
    db.report.count({ where: { resolvedAt: null } }),
    db.universityRequest.findMany({
      where: { reviewedAt: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 50,
      select: { id: true, domain: true, website: true },
    }),
    db.moderationCase.count({
      where: { appealedAt: { not: null }, resolvedAt: null },
    }),
    db.report.findFirst({
      where: { resolvedAt: null },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.moderationCase.findFirst({
      where: { appealedAt: { not: null }, resolvedAt: null },
      orderBy: { appealedAt: "asc" },
      select: { appealedAt: true },
    }),
  ]);
  return {
    lastSuccess: maintenance?.succeededAt ?? null,
    lastFailure: maintenance?.failedAt ?? null,
    stale:
      !maintenance?.succeededAt ||
      now.getTime() - maintenance.succeededAt.getTime() > MAINTENANCE_STALE_MS,
    due,
    oldestDue: oldest?.dueAt ?? null,
    retrying,
    reports,
    appeals,
    oldestReport: oldestReport?.createdAt ?? null,
    oldestAppeal: oldestAppeal?.appealedAt ?? null,
    domainRequests,
  };
}
