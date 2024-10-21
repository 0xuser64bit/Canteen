"use server";
import db from "@/db";

const getPostAction = async ({ postId }: { postId: string }) => {
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
    },
  });
  return post;
};

export { getPostAction };
