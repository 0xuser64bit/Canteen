"use server";

import db from "@/db";

export const voteAction = async ({
  id,
  vote,
}: {
  id: string;
  vote: "UP" | "DOWN";
}) => {
  const voted = await db.opportunity.update({
    where: {
      id,
    },
    data: {
      upvotes: {
        increment: vote === "UP" ? 1 : -1,
      },
    },
  });
  return voted;
};
