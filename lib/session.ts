import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Account identity for restricted status, appeals and deletion. Student access
 * must use getViewer, which rechecks suspension even with a cached cookie.
 */
export const getAccountViewer = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      bannedAt: true,
      email: true,
      createdAt: true,
      university: { select: { id: true, slug: true, name: true } },
    },
  });
});

// Suspension still denies every normal app read and write, including stale cookies.
export const getViewer = cache(async () => {
  const viewer = await getAccountViewer();
  return viewer && !viewer.bannedAt ? viewer : null;
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

/** For pages: sends signed-out visitors to /join. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    if ((await getAccountViewer())?.bannedAt) redirect("/account-status");
    redirect("/join");
  }
  return viewer;
}
