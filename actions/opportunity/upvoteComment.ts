"use server";

import db from "@/db";

export const upvoteCommentAction = async ({
  userId,
  opportunityCommentId,
}: {
  userId: string;
  opportunityCommentId: string;
}) => {
  const comment = await db.upvote.create({
    data: {
      userId,
      // opportunityCommentId,
    },
  });
  return comment;
};
