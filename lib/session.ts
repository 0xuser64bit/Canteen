import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * The signed-in student for this request, or null. Banned accounts count as
 * signed out, even while a cached session cookie is still valid.
 */
export const getViewer = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.user.id, bannedAt: null },
    select: {
      id: true,
      email: true,
      createdAt: true,
      university: { select: { id: true, slug: true, name: true } },
    },
  });
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

/** For pages: sends signed-out visitors to /join. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/join");
  return viewer;
}
