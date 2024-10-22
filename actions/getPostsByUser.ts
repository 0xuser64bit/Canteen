"use server";
import db from "@/db";

export const getPostsByUser = async ({ email }: { email: string }) => {
  const posts = await db.post.findMany({
    where: {
      authorId: email,
    },
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

  const transformedPost = posts.map((post) => ({
    ...post,
    hasLiked: post.likes.length > 0,
    totalLikes: post._count,
    totalComments: post.comments,
    likes: undefined,
    _count: undefined,
  }));

  return transformedPost;
};
