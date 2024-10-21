"use server";

import db from "@/db";

export const getOpportunityAction = async (id: string) => {
  const opportunity = await db.opportunity.findUnique({
    where: {
      id,
    },
  });
  return opportunity;
};
