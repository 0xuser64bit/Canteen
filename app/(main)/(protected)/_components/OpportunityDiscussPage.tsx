"use client";

import { voteAction } from "@/actions/opportunity/vote";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronUp, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Tag from "./Tag";
import { generateRandomColour } from "@/lib/helper";

export const OpportunityDiscussPage = ({
  opportunity,
}: {
  opportunity: any;
}) => {
  const router = useRouter();
  const [upvoted, setUpvoted] = useState(false);

  const handleAddComment = (event: any) => {
    event.preventDefault();
    // db call and create comment in this opportunity
  };
  const handleUpvote = async () => {
    try {
      await voteAction({ id: opportunity.id, vote: "UP" });
      setUpvoted(!upvoted);
    } catch (err) {
      toast.error("Unable to upvote...");
    }
  };
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
          <CardTitle className="text-2xl font-bold">
            {opportunity.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {opportunity.description}
          </p>
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
              <span>{opportunity.upvotes}</span>
            </Button>
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{opportunity.views} views</span>
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
            <Button type="submit">Post Comment</Button>
          </form>
        </CardContent>
      </Card>
      <h2 className="text-xl font-semibold mb-4">Comments</h2>
      <div className="space-y-4 mb-8">
        {[
          {
            id: 1,
            author: "Alice",
            content: "Great solution! Thanks for sharing.",
          },
          {
            id: 2,
            author: "Bob",
            content:
              "I have a question about the time complexity. Can you explain it further?",
          },
        ].map((comment) => (
          <Card
            key={comment.id}
            className="bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20"
          >
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarFallback>{comment.author[0]}</AvatarFallback>
                </Avatar>
                <span className="font-semibold">{comment.author}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p>{comment.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
