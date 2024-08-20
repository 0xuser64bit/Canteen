"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Eye, Heart, MessageCircle, Share } from "lucide-react";
import { useSession } from "next-auth/react";

export const Post = () => {
  const session = useSession();
  const user = session.data?.user;
  return (
    <div>
      <div className="py-4 px-4 flex gap-x-4 cursor-pointer shadow-sm hover:shadow-md rounded-lg border border-slate-100/15 select-none">
        <div className="">
          <Avatar role="button">
            <AvatarImage src={user?.image ?? "canteen.png"} />
          </Avatar>
        </div>
        <div className="text-black dark:text-white w-full">
          <div>
            <p>
              <span className="me-2 text-sm font-medium">Canteen</span>
              <span className="font-light text-gray-400 text-sm cursor-pointer">
                @__canteen
              </span>
            </p>
          </div>
          <div>
            <p className="text-xl font-bold">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit.
            </p>
            <p className="py-2">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit. Esse,
              porro praesentium! Facilis amet facere accusamus quasi enim
              voluptatibus suscipit cum eveniet eaque a.
            </p>
          </div>
          <div className=" pt-2 flex justify-between">
            <div className="flex gap-x-1 items-center">
              <div className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full">
                <Heart className="w-3 h-3" />
                <p className="text-xs">1234</p>
              </div>
              <div className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full">
                <MessageCircle className="w-3 h-3" />
                <p className="text-xs">1234</p>
              </div>
              <div className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full">
                <Eye className="w-3 h-3" />
                <p className="text-xs">1234</p>
              </div>
            </div>
            <div className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-2 px-2 py-1 rounded-full">
              <Share className="w-3 h-3" />
              <p className="text-xs">Share</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
