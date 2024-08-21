"use server";
import db from "@/db";

export const getPostsByUser = async ({ email }: { email: string }) => {
  const posts = await db.post.findMany({
    where: {
      authorId: email,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      mediaUrl: true,
      mediaType: true,
      content: true,
      author: true,
      likes: true,
      views: true,
    },
  });
  return posts;
};
