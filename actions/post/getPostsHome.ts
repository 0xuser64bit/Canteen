"use server";
import db from "@/db";
import { shuffleArray } from "@/lib/helper";

export const getPostsHome = async ({ email }: { email: string }) => {
  const posts = await db.post.findMany({
    orderBy: {
      createdAt: "desc",
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

  let transformedPost = posts.map((post) => ({
    ...post,
    hasLiked: post.likes.length > 0,
    totalLikes: post._count,
    totalComments: post.comments,
    likes: undefined,
    _count: undefined,
  }));

  transformedPost = shuffleArray(transformedPost);
  return transformedPost;
};
