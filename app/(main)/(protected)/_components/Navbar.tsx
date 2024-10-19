"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  NotebookPen,
  Search
} from "lucide-react";

import { useSearch } from "@/components/hooks/useSearch";
import { Notification } from "./Notification";
import { UserAvatar } from "./userAvatar";


export const Navbar = () => {
  const router = useRouter();
  const search = useSearch();
  const [imageSrc, setImageSrc] = useState("/canteen-dark.png");
  const { theme } = useTheme();

  useEffect(() => {
    setImageSrc(theme === "dark" ? "/canteen-dark.png" : "/canteen.png");
  }, [theme]);

  return (
    <div className="flex justify-center py-2 border-b border-b-slate-500/50 mb-2">
      <div className="flex items-center pl-5 w-[20%]">
        <div
          role="button"
          onClick={() => {
            router.push("/home");
          }}
        >
          <img src={imageSrc} className="w-20" />
        </div>
      </div>
      <div className="md:w-[65%] justify-center flex items-center font-bold text-2xl">
        <div
          className="text-black dark:text-white font-sans"
          role="button"
          onClick={() => router.push("/home")}
        >
          College Canteen
        </div>
      </div>
      <div className="flex items-center md:w-1/4 justify-evenly">
        <div
          role="button"
          onClick={() => {
            search.onOpen();
          }}
        >
          <Search className="w-7 h-7 mr-1 text-black dark:text-white" />
        </div>
        <div
          role="button"
          className="hover:bg-slate-200 dark:bg-opacity-20 p-3 rounded-full"
          onClick={() => {
            router.push("/write/post");
          }}
        >
          <NotebookPen className="w-7 h-7 mr-1 text-black dark:text-white" />
        </div>
        <Notification />
        <UserAvatar />
      </div>
    </div>
  );
};
