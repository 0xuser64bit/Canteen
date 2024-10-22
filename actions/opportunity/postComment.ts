"use server";

import db from "@/db";

export const postCommentAction = async ({
  userId,
  opportunityId,
  content,
}: {
  userId: string;
  opportunityId: string;
  content: string;
}) => {
  const comment = await db.opportunityComment.create({
    data: {
      content,
      userId,
      opportunityId,
    },
  });
  return comment;
};
