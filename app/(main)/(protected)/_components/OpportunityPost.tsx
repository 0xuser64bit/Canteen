"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronUp, Eye } from "lucide-react";
import { useState } from "react";

interface OpportunityPostProps {
  title: string;
  description: string;
  initialUpvotes: number;
  initialViews: number;
}

export const OpportunityPost = ({
  title,
  description,
  initialUpvotes,
  initialViews,
}: OpportunityPostProps) => {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [upvoted, setUpvoted] = useState(false);
  const [views, setViews] = useState(initialViews); // Todo: views === clicks on post

  const handleUpvote = () => {
    setUpvoted(!upvoted);
    if (!upvoted) {
      // Todo: db call to increase vote++
      setUpvotes((prevUpvotes) => prevUpvotes + 1);
    } else {
      // Todo: db call to decrease vote--
      setUpvotes((prevUpvotes) => prevUpvotes - 1);
    }
  };

  return (
    <div role="button" onClick={() => {}}>
      <Card className="w-full hover:shadow-xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{description}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-x-2">
          <Button
            variant={upvoted ? "secondary" : "outline"}
            size="sm"
            onClick={handleUpvote}
          >
            <ChevronUp className="mr-2 h-4 w-4" />
            {upvotes}
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            {views}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
