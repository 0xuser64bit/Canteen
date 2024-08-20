"use client";

import { BriefcaseBusiness, Home, Search, Star, Users } from "lucide-react";
import { Tabs } from "./Tabs";
import { useSession } from "next-auth/react";
import { UserAvatar } from "./userAvatar";
import { useTheme } from "next-themes";

const tabs = [
  {
    title: "Community",
    value: "community",
    icon: <Home className="w-4 h-4" />,
  },
  {
    title: "Opportunities",
    value: "opportunities",
    icon: <BriefcaseBusiness className="w-4 h-4" />,
  },
  {
    title: "Reviews",
    value: "reviews",
    icon: <Star className="w-4 h-4" />,
  },
  {
    title: "Clubs",
    value: "clubs",
    icon: <Users className="w-4 h-4" />,
  },
];

export const Navbar = () => {
  const session = useSession();
  const { theme } = useTheme();
  return (
    <div className="flex justify-center py-2">
      <div className="flex items-center w-1/4">
        <div>
          <img
            src={theme === "dark" ? "/canteen-dark.png" : "canteen.png"}
            className="w-16 h-16"
          />
        </div>
        <div className="flex items-center bg-slate-200 dark:bg-transparent rounded-xl px-2 dark:border dark:border-slate-200/30">
          <Search className="w-5 h-5 mr-1 text-black dark:text-white" />
          <input
            type="text"
            className="px-2 py-[6px] focus:outline-none bg-slate-200 dark:bg-transparent rounded-xl  text-black dark:text-white font-mono placeholder:opacity-40 placeholder:text-black dark:placeholder:text-white"
            placeholder="Search"
          />
        </div>
      </div>
      <div className="w-1/2">
        <Tabs tabs={tabs} />
      </div>
      <div className="flex gap-x-4 w-1/4">
        <UserAvatar session={session} />
      </div>
    </div>
  );
};
