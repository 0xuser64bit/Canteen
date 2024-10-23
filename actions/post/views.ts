"use server";

import db from "@/db";

export const viewsAction = async ({ postId }: { postId: string }) => {
  const post = await db.post.update({
    where: {
      id: postId,
    },
    data: {
      views: {
        increment: 1,
      },
    },
  });
  return post;
};
