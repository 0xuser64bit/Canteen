"use server";

import db from "@/db";

export const sharesAction = async ({ postId }: { postId: string }) => {
  const post = await db.post.update({
    where: {
      id: postId,
    },
    data: {
      shares: {
        increment: 1,
      },
    },
  });
  return post;
};
