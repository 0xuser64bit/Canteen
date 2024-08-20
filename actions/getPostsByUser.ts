"use server";
import db from "@/db";

export const getPostsByUser = async ({ userId }: { userId: string }) => {
  const posts = await db.post.findMany({
    where: {
      authorId: userId,
    },
    select: {
      id: true,
      title: true,
      mediaUrl: true,
      content: true,
      author: true,
      likes: true,
      views: true,
    },
  });
  return posts;
};
