"use server";

import db from "@/db";

export const viewsAction = async ({
  opportunityId,
}: {
  opportunityId: string;
}) => {
  const post = await db.opportunity.update({
    where: {
      id: opportunityId,
    },
    data: {
      views: {
        increment: 1,
      },
    },
  });
  return post;
};
