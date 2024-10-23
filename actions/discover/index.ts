"use server";

import db from "@/db";

export const getLatestUpdateAction = async () => {
  const opportunities = await db.opportunity.findMany({
    orderBy: {
      upvotes: {
        _count: "desc",
      },
    },
    take: 5,
    select: {
      id: true,
      title: true,
      views: true,
    },
  });

  const posts = await db.post.findMany({
    orderBy: {
      createdAt: "desc",
      // Todo: create Like[] and then take post based on likes count
    },
    take: 5,
    select: {
      id: true,
      title: true,
      views: true,
    },
  });
  return { opportunities, posts };
};
