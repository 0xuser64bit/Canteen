import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeReturnTo } from "@/lib/return-to";
import { campusHostDomains } from "@/lib/campus-hosts";
import { TEAM } from "@/lib/universities";

const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/** Opaque and session-scoped: a new sign-in cannot adopt an old browser draft. */
export const getDraftOwner = cache(async () => {
  const session = await getSession();
  if (!session) return "";
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production")
    throw new Error("BETTER_AUTH_SECRET is required in production");
  return createHmac("sha256", secret ?? "canteen-development-secret")
    .update(`draft:${session.session.id}`)
    .digest("hex");
});

/**
 * Account identity for restricted status, appeals and deletion. Student access
 * must use getViewer, which rechecks suspension even with a cached cookie.
 */
export const getAccountViewer = cache(async () => {
  const session = await getSession();
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
export type Viewer = NonNullable<
  Awaited<ReturnType<typeof getAccountViewer>>
> & {
  hostCampuses?: { id: string; slug: string; name: string }[];
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const viewer = await getAccountViewer();
  if (!viewer || viewer.bannedAt) return null;
  const domains =
    viewer.university.slug === TEAM.slug ? campusHostDomains(viewer.email) : [];
  const hostCampuses = domains.length
    ? await db.university.findMany({
        where: { domain: { in: domains } },
        select: { id: true, slug: true, name: true },
      })
    : [];
  return { ...viewer, hostCampuses };
});

/** For pages: sends signed-out visitors to /join. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    if ((await getAccountViewer())?.bannedAt) redirect("/account-status");
    const next = safeReturnTo((await headers()).get("x-canteen-return-to"));
    redirect(`/join?next=${encodeURIComponent(next)}`);
  }
  return viewer;
}
