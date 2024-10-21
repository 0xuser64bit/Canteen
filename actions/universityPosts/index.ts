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
    include: {
      author: {
        select: {
          university: true,
          image: true,
        },
      },
    },
  });
  return posts;
};
