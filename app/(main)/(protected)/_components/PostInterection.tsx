"use client";

import { PostLikeAction } from "@/actions/post/postLike";
import { Eye, Heart, MessageCircle, Share } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const PostInterection = ({
  likes,
  comments,
  shares,
  views,
  hasLiked,
  postId,
}: {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  hasLiked: boolean;
  postId: string;
}) => {
  const [liked, setLiked] = useState(hasLiked);
  const session = useSession();
  const router = useRouter();

  const handleInterection = async () => {
    if (!liked) {
      await PostLikeAction({
        userId: session.data?.user?.email!,
        postId,
        liked: true,
      });
      setLiked(true);
      router.refresh();
    } else {
      await PostLikeAction({
        userId: session.data?.user?.email!,
        postId,
        liked: false,
      });
      setLiked(false);
      router.refresh();
    }
  };
  return (
    <div className="pt-4 flex justify-between">
      <div className="flex gap-x-1 items-center">
        <div
          className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
          role="button"
          onClick={() => handleInterection()}
        >
          <Heart className="w-5 h-5" fill={liked ? "#FF0000" : ""} />
          <p className="text-xs">{likes}</p>
        </div>
        <div
          className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
          role="button"
        >
          <MessageCircle className="w-5 h-5" />
          <p className="text-xs">{comments}</p>
        </div>
        <div
          className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
          role="button"
        >
          <Eye className="w-5 h-5" />
          <p className="text-xs">{views}</p>
        </div>
      </div>
      <div
        className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-2 px-2 py-1 rounded-full"
        role="button"
      >
        <Share className="w-5 h-5" />
        <p className="text-xs">{shares}</p>
      </div>
    </div>
  );
};
