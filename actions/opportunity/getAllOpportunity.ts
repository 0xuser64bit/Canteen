"use server";

import db from "@/db";

export const getAllOpportunityAction = async ({ email }: { email: string }) => {
  const opportunities = await db.opportunity.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      tags: {
        select: {
          name: true,
        },
      },
      upvotes: {
        where: {
          userId: email,
        },
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          upvotes: true,
        },
      },
    },
  });

  const transformedOpportunities = opportunities.map((opportunity) => ({
    ...opportunity,
    hasUpvoted: opportunity.upvotes.length > 0,
    totalUpvotes: opportunity._count,

    upvotes: undefined,
    _count: undefined,
  }));
  return transformedOpportunities;
};
