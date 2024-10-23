"use client";

import { useEffect, useState } from "react";
import { Post } from "./Post";
import { QuickPost } from "./QuickPost";

export const Timeline = ({ allposts }: { allposts: any }) => {
  const [posts, setPosts] = useState(allposts ?? []);
  useEffect(() => {
    setPosts(allposts ?? []);
  }, [allposts]);
  return (
    <div>
      <QuickPost />
      {posts &&
        posts?.map((post: any) => (
          <Post
            key={post.id}
            id={post.id}
            image={post.author?.image}
            university={post.author?.university}
            title={post.title}
            media={post.mediaUrl as string}
            mediaType={post.mediaType as string}
            content={post.content}
            hasLiked={post.hasLiked}
            totalLikes={post.totalLikes.likes!}
            shares={0}
            views={post.views}
            comments={post.totalComments.length!}
          />
        ))}
    </div>
  );
};
