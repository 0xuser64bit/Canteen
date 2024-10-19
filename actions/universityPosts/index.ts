"use server";

import db from "@/db";

export const getUniversityPosts = async ({
  userUniversity,
}: {
  userUniversity: string;
}) => {
  const posts = await db.post.findMany({
    where: {
      author: {
        university: userUniversity,
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
