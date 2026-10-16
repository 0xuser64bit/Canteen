import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { idInput } from "@/lib/validation";
import { blobToken } from "@/server/media";
import { isModerator, visibleTo } from "@/server/queries";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer();
  if (!viewer)
    return new Response(null, { status: 401, headers: privateHeaders });
  const { id } = await params;
  if (!idInput.safeParse(id).success)
    return new Response(null, { status: 404, headers: privateHeaders });
  const post = await db.post.findFirst({
    where: {
      id,
      ...(isModerator(viewer)
        ? {}
        : { OR: [{ authorId: viewer.id }, visibleTo(viewer)] }),
    },
    select: { imageUrl: true },
  });
  if (!post?.imageUrl)
    return new Response(null, { status: 404, headers: privateHeaders });
  try {
    const file = await get(post.imageUrl, {
      ...blobToken(post.imageUrl),
      useCache: false,
      abortSignal: AbortSignal.timeout(10_000),
    });
    if (!file || file.statusCode !== 200)
      return new Response(null, { status: 404, headers: privateHeaders });
    const contentType = file.blob.contentType;
    if (!["image/webp", "image/png", "image/jpeg"].includes(contentType))
      throw new Error("Invalid stored image");
    return new Response(file.stream, {
      headers: { ...privateHeaders, "Content-Type": contentType },
    });
  } catch {
    console.error("Image delivery failed");
    return new Response(null, { status: 503, headers: privateHeaders });
  }
}
