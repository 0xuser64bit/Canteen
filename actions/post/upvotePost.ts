"use server";

import db from "@/db";

export const upvotePostAction = async ({
  email,
  commentId,
}: {
  email: string;
  commentId: string;
}) => {
  const comment = await db.commentUpvote.create({
    data: {
      id: commentId,
      userId: email,
    },
  });
  return comment;
};
