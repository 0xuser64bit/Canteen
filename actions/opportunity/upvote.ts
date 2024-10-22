"use server";

import db from "@/db";

export const upvoteHandler = async ({
  userId,
  opportunityId,
}: {
  userId: string;
  opportunityId: string;
}) => {
  const upvote = await db.upvote.create({
    data: {
      userId,
      opportunityId,
    },
  });
  return upvote;
};
