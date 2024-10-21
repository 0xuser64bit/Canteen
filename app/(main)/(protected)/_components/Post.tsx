"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EllipsisVertical,
  Eye,
  Heart,
  MessageCircle,
  Share,
} from "lucide-react";
import { useRouter } from "next/navigation";

export const Post = ({
  id,
  title,
  media,
  mediaType,
  content,
  likes,
  comments,
  views,
  shares,
  image,
  university,
}: {
  id: string;
  title: string;
  media: string;
  mediaType: string;
  content: string;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  image: string;
  university: string;
}) => {
  const router = useRouter();
  const base_url = "http://localhost:3000";
  return (
    <div className="flex gap-x-2 shadow-sm hover:shadow-md rounded-lg dark:border-slate-100/15 select-none mb-3">
      <div className="p-2 h-24">
        <Avatar role="button">
          <AvatarImage className="w-16 object-cover" src={image} />
        </Avatar>
      </div>
      <div className="text-black dark:text-white w-full p-3">
        <div className="flex justify-between">
          <div role="button">
            <span className="me-2 text-sm font-medium hover:underline">
              {university}
            </span>
          </div>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <EllipsisVertical className="w-4 h-4 cursor-pointer" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48"
                align="end"
                alignOffset={11}
                forceMount
              >
                <div className="flex flex-col">
                  <DropdownMenuItem
                    asChild
                    className="w-full cursor-pointer text-muted-foreground"
                  >
                    <div
                      role="button"
                      className="flex w-full select-none items-center p-3 text-sm hover:bg-slate-300/25"
                      onClick={(e) => {
                        navigator.clipboard.writeText(
                          base_url + "/posts/" + id,
                        );
                      }}
                    >
                      <span className="line-clamp-1 text-start font-medium">
                        Copy link
                      </span>
                    </div>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div role="button" onClick={() => router.push("posts/" + id)}>
          <div>
            <p className="text-xl font-bold">{title}</p>
            <p className="pb-2 text-sm">{content}</p>
          </div>
          {media && (
            <div className="flex justify-center items-center overflow-hidden pb-2 mr-5">
              <img
                src={media}
                alt="media image"
                className="object-cover rounded-lg border"
              />
            </div>
          )}
        </div>
        <div className=" pt-2 flex justify-between">
          <div className="flex gap-x-1 items-center">
            <div
              className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
              role="button"
              onClick={() => {}}
            >
              <Heart className="w-3 h-3" />
              <p className="text-xs">{likes}</p>
            </div>
            <div
              className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
              role="button"
              onClick={() => {}}
            >
              <MessageCircle className="w-3 h-3" />
              <p className="text-xs">{comments}</p>
            </div>
            <div
              className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
              role="button"
              onClick={() => {}}
            >
              <Eye className="w-3 h-3" />
              <p className="text-xs">{views}</p>
            </div>
          </div>
          <div
            className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-2 px-2 py-1 rounded-full"
            role="button"
            onClick={() => {}}
          >
            <Share className="w-3 h-3" />
            <p className="text-xs">{shares}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
