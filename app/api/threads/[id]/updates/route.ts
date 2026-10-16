import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { idInput } from "@/lib/validation";
import { visibleTo } from "@/server/queries";

const headers = {
  "Cache-Control": "private, no-store",
  "CDN-Cache-Control": "no-store",
};

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer();
  if (!viewer) return new Response(null, { status: 401, headers });
  const { id } = await params;
  if (!idInput.safeParse(id).success)
    return new Response(null, { status: 404, headers });
  const post = await db.post.findFirst({
    where: { id, OR: [{ authorId: viewer.id }, visibleTo(viewer)] },
    select: { revision: true },
  });
  return post
    ? Response.json(post, { headers })
    : new Response(null, { status: 404, headers });
}
