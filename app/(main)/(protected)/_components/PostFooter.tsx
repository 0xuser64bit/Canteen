"use client";

import { Eye, Heart, MessageCircle, Share } from "lucide-react";

export const PostFooter = () => {
  const likes = 0;
  const comments = 0;
  const views = 0;
  const shares = 0;
  return (
    <div className=" pt-2 flex justify-between w-full">
      <div className="flex gap-x-1 items-center">
        <div
          className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
          role="button"
          onClick={() => { }}
        >
          <Heart className="w-4 h-4" />
          <p className="text-xs">{likes}</p>
        </div>
        <div
          className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
          role="button"
          onClick={() => { }}
        >
          <MessageCircle className="w-4 h-4" />
          <p className="text-xs">{comments}</p>
        </div>
        <div
          className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-1 px-2 py-1 rounded-full"
          role="button"
          onClick={() => { }}
        >
          <Eye className="w-4 h-4" />
          <p className="text-xs">{views}</p>
        </div>
      </div>
      <div
        className="bg-slate-100 dark:bg-transparent dark:hover:bg-slate-100/10 hover:bg-slate-200 flex justify-center items-center gap-x-2 px-2 py-1 rounded-full"
        role="button"
        onClick={() => { }}
      >
        <Share className="w-4 h-4" />
        <p className="text-xs">{shares}</p>
      </div>
    </div>
  )
}
