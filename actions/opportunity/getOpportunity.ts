"use server";

import db from "@/db";

export const getOpportunityAction = async ({
  id,
  email,
}: {
  id: string;
  email: string;
}) => {
  const opportunity = await db.opportunity.findUnique({
    where: {
      id,
    },
    include: {
      tags: { select: { name: true } },
      upvotes: {
        where: {
          userId: email,
        },
        select: {
          id: true,
        },
      },
      OpportunityComment: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          upvotes: true,
        },
      },
      _count: {
        select: {
          upvotes: true,
        },
      },
    },
  });

  const transformedOpportunity = {
    ...opportunity,
    hasUpvoted: (opportunity?.upvotes?.length ?? 0) > 0,
    totalUpvotes: opportunity?._count,

    upvotes: undefined,
    _count: undefined,
  };
  return transformedOpportunity;
};
