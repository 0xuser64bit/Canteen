"use server";

import db from "@/db";

export const getAllPostOfUniveristy = async ({
  universityName,
  email,
}: {
  universityName: string;
  email: string;
}) => {
  const posts = await db.post.findMany({
    where: {
      author: {
        university: universityName,
      },
    },
    include: {
      author: {
        select: {
          image: true,
          university: true,
        },
      },
      likes: {
        where: {
          userId: email,
        },
        select: {
          id: true,
        },
      },
      comments: {
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          likes: true,
        },
      },
    },
  });

  let transformedPosts = posts.map((post) => ({
    ...post,
    hasLiked: post.likes.length > 0,
    totalLikes: post._count,
    totalComments: post.comments,
    likes: undefined,
    _count: undefined,
  }));
  return transformedPosts;
};
