"use client";

import { createCommentAction } from "@/actions/post/createComment";
import { upvotePostAction } from "@/actions/post/upvotePost";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/helper";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export const CommentInterection = ({
  comments,
  postId,
  email,
}: {
  comments: { id: string; content: string; createdAt: Date; upvotes: any }[];
  postId: string;
  email: string;
}) => {
  const session = useSession();
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [content, setContet] = useState("");
  const router = useRouter();

  const nhandleCommentUpvote = async (commentId: string) => {
    try {
      if (!isUpvoted) {
        await upvotePostAction({
          commentId,
          email: session.data?.user?.email!,
        });
        setIsUpvoted(true);
      }
    } catch (err) {
      toast.error("unable to upvote comment");
    }
  };

  const handlePostComment = async () => {
    try {
      await createCommentAction({ content, postId, email });
      toast.success("Comment posted successfully.");
      setContet("");
      router.refresh();
    } catch (err) {
      toast.error("unable to post comment");
    }
  };
  return (
    <Card className="mb-8 bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20 ">
      <CardHeader className="border-b">
        <h3 className="text-lg font-semibold">Comments</h3>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-8 h-8">
            <AvatarFallback>CC</AvatarFallback>
          </Avatar>
          <Input
            placeholder="What are your thoughts?"
            className="flex-grow bg-[#f9f9fb] dark:bg-black"
            onChange={(e) => setContet(e.target.value)}
          />
        </div>
        <Button className="mb-6" onClick={() => handlePostComment()}>
          Post anonymously
        </Button>
        <Separator className="my-6" />
        {comments.map((comment) => (
          <div key={comment.id} className="mb-6">
            <div className="flex items-start gap-4 mb-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback>{"CC"}</AvatarFallback>
              </Avatar>
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm dark:text-slate-400">
                    {formatDate(comment.createdAt)}
                  </span>
                  {/* Todo: createdAt - now() and show that below */}
                  <span className="text-xs text-gray-500">• 2h ago</span>
                </div>
                <p className="text-sm pt-4">{comment.content}</p>
                {/* <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <div
                    className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
                    role="button"
                    onClick={() => handleCommentUpvote(comment.id)}
                  >
                    <ArrowBigUp className="w-6 h-6" fill={isUpvoted ? "#05fc43" : ""} />
                    <p className="text-xs">{comment.upvotes.length}</p>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
