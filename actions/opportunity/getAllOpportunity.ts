"use server";

import db from "@/db";

export const getAllOpportunityAction = async () => {
  const opportunities = await db.opportunity.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      tags: true,
    },
  });
  return opportunities;
};
