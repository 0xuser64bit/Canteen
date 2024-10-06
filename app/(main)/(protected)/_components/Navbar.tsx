"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import {
  BriefcaseBusiness,
  Home,
  NotebookPen,
  Search,
  Star,
  Users,
} from "lucide-react";

import { Notification } from "./Notification";
import { Tabs } from "./Tabs";
import { UserAvatar } from "./userAvatar";
import { useSearch } from "@/components/hooks/useSearch";

const tabs = [
  {
    title: "Community",
    value: "community",
    icon: <Home className="w-4 h-4" />,
    redirect: "/community",
  },
  {
    title: "Opportunities",
    value: "opportunities",
    icon: <BriefcaseBusiness className="w-4 h-4" />,
    redirect: "/opportunities",
  },
  {
    title: "Reviews",
    value: "reviews",
    icon: <Star className="w-4 h-4" />,
    redirect: "/reviews",
  },
  {
    title: "Clubs",
    value: "clubs",
    icon: <Users className="w-4 h-4" />,
    redirect: "/clubs",
  },
];

export const Navbar = () => {
  const router = useRouter();
  const search = useSearch();
  const [imageSrc, setImageSrc] = useState("/canteen.png");
  const { theme } = useTheme();

  useEffect(() => {
    setImageSrc(theme === "dark" ? "/canteen-dark.png" : "/canteen.png");
  }, [theme]);

  return (
    <div className="flex justify-center py-2 border-b border-b-slate-500/50 mb-2">
      <div className="flex items-center w-[20%]">
        <div
          role="button"
          onClick={() => {
            router.push("/community");
          }}
        >
          <img src={imageSrc} className="w-20" />
        </div>
      </div>
      <div className="md:w-[65%] w-full">
        <Tabs tabs={tabs} />
      </div>
      <div className="flex items-center gap-x-4 md:w-1/4 justify-end">
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
          <NotebookPen />
        </div>
        <Notification />
        <UserAvatar />
      </div>
    </div>
  );
};
