"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronUp, Eye } from "lucide-react";
import { useState } from "react";
import Tag from "./Tag";

interface OpportunityPostProps {
  title: string;
  description: string;
  initialUpvotes: number;
  initialViews: number;
  created_on: string;
  tags?: string[];
}
// Todo: add Tags to post properties
export const OpportunityPost = ({
  title,
  description,
  initialUpvotes,
  initialViews,
  created_on,
  tags,
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
    <Card className="w-full hover:shadow-xl ms-5 bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20">
      <CardHeader>
        <CardTitle role="button" onClick={() => {}}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex gap-x-5 justify-between">
          <div>
            <p className="pb-2">{description.slice(0, 100) + "..."}</p>
            {tags &&
              tags.map((tag, index) => (
                <Tag key={index} label={tag} onClick={() => {}} />
              ))}
          </div>
          <div className="flex gap-x-2">
            <Button
              variant={upvoted ? "secondary" : "outline"}
              size="sm"
              onClick={handleUpvote}
            >
              <ChevronUp className="mr-2 h-4 w-4" />
              {upvotes}
            </Button>
            <Button variant={"ghost"} size="sm">
              <Eye className="mr-2 h-4 w-4" />
              {views}
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-6 pb-2">
        <p className="text-gray-500 text-xs">{created_on}</p>
      </CardFooter>
    </Card>
  );
};
