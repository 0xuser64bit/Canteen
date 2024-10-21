"use server";

import db from "@/db";

export const getUniversityPosts = async ({ user }: { user: string }) => {
  const university = await db.user.findFirst({
    where: {
      email: user,
    },
  });
  const posts = await db.post.findMany({
    where: {
      author: {
        university: university?.name?.trim(),
      },
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
      likesCount: true,
      viewsCount: true,
    },
  });
  return posts;
};
