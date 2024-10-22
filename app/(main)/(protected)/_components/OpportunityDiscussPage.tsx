"use client";

import { postCommentAction } from "@/actions/opportunity/postComment";
import { upvoteHandler } from "@/actions/opportunity/upvote";
import { Spinner } from "@/components/Spinner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, generateRandomColour } from "@/lib/helper";
import { ArrowBigUp, ArrowLeft, ChevronUp, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Tag from "./Tag";

export const OpportunityDiscussPage = ({
  id,
  title,
  description,
  totalUpvotes,
  hasUpvoted,
  totalViews,
  userId,
  tags,
  comments,
}: {
  id: string;
  title: string;
  description: string;
  totalUpvotes: number;
  hasUpvoted: boolean;
  totalViews: number;
  userId: string;
  tags: string[];
  comments: any[];
}) => {
  const router = useRouter();
  const [upvoted, setUpvoted] = useState(hasUpvoted);
  const [commentUpvoted, setCommentUpvoted] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const handleAddComment = async (event: any) => {
    event.preventDefault();
    setIsPosting(true);
    try {
      await postCommentAction({
        userId,
        opportunityId: id,
        content: event.target.comment.value,
      });
      event.target.comment.value = "";
      toast.success("Your comment has been posted!");
    } catch (err) {
      toast.error("Unable to post comment...");
    } finally {
      setIsPosting(false);
      router.refresh();
    }
  };

  const handleUpvote = async () => {
    try {
      if (!upvoted) {
        await upvoteHandler({ userId, opportunityId: id });
        setUpvoted(true);
        router.refresh();
      } else {
        toast.info("You have already upvoted this opportunity");
      }
    } catch (err) {
      toast.error("Unable to upvote...");
    }
  };

  // const handleCommentVote = async (id: string) => {
  //   try {
  //     if (!commentUpvoted) {
  //       await upvoteCommentAction({ userId, opportunityCommentId: id });
  //       setCommentUpvoted(true);
  //       router.refresh();
  //     } else {
  //       toast.info("You have already upvoted this comment");
  //     }
  //   } catch (err) {
  //     toast.error("Unable to upvote this comment");
  //   }
  // }
  return (
    <div>
      <div
        className="w-8 py-2 px-1 hover:bg-slate-400/30 dark:hover:bg-slate-500/30 rounded-full"
        role="button"
        onClick={() => {
          router.back();
        }}
      >
        <ArrowLeft className="w-6 h-5 mr-2 text-black dark:text-white" />
      </div>
      <Card className="mb-8 bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <div>
            {tags.map((tag) => (
              <Tag key={tag} label={tag} colour={generateRandomColour()} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{description}</p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <Button
              variant={upvoted ? "secondary" : "outline"}
              size="sm"
              className="flex items-center space-x-1"
              onClick={handleUpvote}
            >
              <ChevronUp
                className={`h-4 w-4 ${upvoted ? "text-green-400" : ""}`}
              />
              <span>{totalUpvotes}</span>
            </Button>
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{totalViews}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20 mb-4">
        <CardHeader>
          <CardTitle>Add a comment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handleAddComment(e)}>
            <Textarea
              name="comment"
              placeholder="Type your comment here."
              className="mb-2 bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20"
            />
            <Button type="submit">
              {isPosting ? <Spinner /> : "Post Comment"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <h2 className="text-xl font-semibold mb-4">Comments</h2>
      <div className="space-y-4 mb-8">
        {comments.map((comment) => (
          <Card
            key={comment.id}
            className="bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20"
          >
            <CardHeader>
              <div className="flex items-center gap-x-2">
                <Avatar>
                  <AvatarFallback>{"CC"}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-slate-400">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p>{comment.content}</p>
            </CardContent>
            <CardFooter>
              <div className="flex items-center gap-x-2">
                <div
                  role="button"
                  // onClick={() => handleCommentVote(comment.id)}
                >
                  <ArrowBigUp
                    className="w-6 h-6"
                    fill={commentUpvoted ? "#05fc43" : ""}
                  />
                </div>
                <p>{comment.upvotes}</p>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
