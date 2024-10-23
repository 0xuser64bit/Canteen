"use client";

import { createCommentAction } from "@/actions/post/createComment";
import { PostLikeAction } from "@/actions/post/postLike";
import { sharesAction } from "@/actions/post/shares";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Heart, MessageCircle, Share } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [content, setContent] = useState("");
  const session = useSession();
  const router = useRouter();
  const base_url = "http://localhost:3000";

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

  const handlePostComment = async () => {
    if (!content) {
      toast.info("Comment is empty");
      return;
    }
    setIsLoading(true);
    try {
      await createCommentAction({
        postId,
        content,
        email: session.data?.user?.email!,
      });
    } catch (err) {
      toast.error("Unable to post your commnet");
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
      setContent("");
      router.refresh();
    }
  };

  const handleShares = async () => {
    try {
      await sharesAction({ postId });
      navigator.clipboard.writeText(base_url + "/posts/" + postId);
      toast.success("Link copied to clipboard");
    } catch (err) {
      console.log("not able to share post");
    } finally {
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <div
              className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
              role="button"
            >
              <MessageCircle className="w-5 h-5" />
              <p className="text-xs">{comments}</p>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>What are your thoughts on this?</DialogTitle>
            </DialogHeader>
            <div>
              <Textarea
                id="comment"
                name="comment"
                value={content}
                placeholder="write down something here..."
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => handlePostComment()}>
                {isLoading ? <Spinner /> : "Comment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
        onClick={() => handleShares()}
      >
        <Share className="w-5 h-5" />
        <p className="text-xs">{shares}</p>
      </div>
    </div>
  );
};
