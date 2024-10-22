"use server";

import db from "@/db";

export const createCommentAction = async ({
  postId,
  email,
  content,
}: {
  postId: string;
  email: string;
  content: string;
}) => {
  const comment = await db.comment.create({
    data: {
      content,
      userId: email,
      postId,
    },
  });
  return comment;
};
