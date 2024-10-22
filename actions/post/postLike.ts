"use server";

import db from "@/db";

export const PostLikeAction = async ({
  userId,
  postId,
  liked = true,
}: {
  userId: string;
  postId: string;
  liked: boolean;
}) => {
  if (liked) {
    const interaction = await db.like.create({
      data: {
        userId,
        postId,
      },
    });
    return interaction;
  } else {
    const interaction = await db.like.deleteMany({
      where: {
        userId,
        postId,
      },
    });
    return interaction;
  }
};
