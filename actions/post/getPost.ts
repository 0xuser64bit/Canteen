"use server";
import db from "@/db";

const getPostAction = async ({
  postId,
  email,
}: {
  postId: string;
  email: string;
}) => {
  const post = await db.post.findUnique({
    where: {
      id: postId,
    },
    include: {
      author: {
        select: {
          university: true,
          image: true,
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
          content: true,
          createdAt: true,
          upvotes: true,
        },
      },
      _count: {
        select: {
          likes: true,
        },
      },
    },
  });

  const transformedPost = {
    ...post,
    hasLiked: (post?.likes.length ?? 0) > 0,
    totalLikes: post?._count,
    totalComments: post?.comments,
    likes: undefined,
    _count: undefined,
  };

  return transformedPost;
};

export { getPostAction };
