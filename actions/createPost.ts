"use server";
import db from "@/db";

interface createPostProps {
  user: string;
  title: string;
  content: string;
  imageUrl?: string;
}

const createPost = async ({
  user,
  title,
  content,
  imageUrl,
}: createPostProps) => {
  console.log("hello");

  const post = await db.post.create({
    data: {
      title,
      content,
      authorId: user,
      mediaUrl: imageUrl,
    },
  });
  return post;
};

export { createPost };
