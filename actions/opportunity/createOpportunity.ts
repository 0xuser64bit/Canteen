"use server";

import db from "@/db";

export const createOpportunityAction = async ({
  title,
  description,
  tags,
  userId,
}: {
  title: string;
  description: string;
  tags: string[];
  userId: string;
}) => {
  const opportunity = await db.opportunity.create({
    data: {
      title,
      description,
      userId,
      tags: {
        create: tags.map((tag) => ({ name: tag })),
      },
    },
  });
  return opportunity;
};
