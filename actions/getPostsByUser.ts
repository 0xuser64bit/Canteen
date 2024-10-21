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
    include: {
      author: {
        select: {
          image: true,
          university: true,
        },
      },
    },
  });
  return posts;
};
