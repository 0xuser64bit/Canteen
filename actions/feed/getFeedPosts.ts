"use server";

import db from "@/db";

export const getFeedPosts = async ({ email }: { email: string }) => {
  const posts = await db.post.findMany({
    where: {
      type: "PUBLIC",
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
      views: true,
    },
  });
  return posts;
};
