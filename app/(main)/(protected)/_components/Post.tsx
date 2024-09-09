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
import { useSession } from "next-auth/react";

export const Post = ({
  title,
  media,
  mediaType,
  content,
  likes,
  comments,
  views,
  shares,
}: {
  title: string;
  media: string;
  mediaType: string;
  content: string;
  likes: number;
  comments: number;
  views: number;
  shares: number;
}) => {
  const session = useSession();
  const user = session.data?.user;

  return (
    <div className="py-4 px-4 flex gap-x-4 cursor-pointer shadow-sm hover:shadow-md dark:hover:opacity-80 rounded-lg border dark:border-slate-100/15 select-none mb-3">
      <div className="">
        <Avatar role="button">
          <AvatarImage src={user?.image ?? "canteen.png"} />
        </Avatar>
      </div>
      <div className="text-black dark:text-white w-full">
        <div className="flex justify-between">
          <div>
            <span className="me-2 text-sm font-medium">Canteen</span>
            <span className="font-light text-gray-400 text-sm cursor-pointer">
              @__canteen
            </span>
          </div>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <EllipsisVertical className="w-4 h-4" />
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
                      onClick={() => {}}
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
        <div>
          <div>
            <p className="text-xl font-bold">{title}</p>
            <p className="pb-2 text-sm">{content}</p>
          </div>
          {media && (
            <div className="flex justify-center items-center overflow-hidden pb-2">
              <img
                src={media}
                alt="media image"
                className="object-cover w-[450px] h-[300px] rounded-lg border"
              />
            </div>
          )}
        </div>
        <div className=" pt-2 flex justify-between">
          <div className="flex gap-x-1 items-center">
            <div className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full">
              <Heart className="w-3 h-3" />
              <p className="text-xs">{likes}</p>
            </div>
            <div className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full">
              <MessageCircle className="w-3 h-3" />
              <p className="text-xs">{comments}</p>
            </div>
            <div className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full">
              <Eye className="w-3 h-3" />
              <p className="text-xs">{views}</p>
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-2 px-2 py-1 rounded-full">
            <Share className="w-3 h-3" />
            <p className="text-xs">{shares}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
