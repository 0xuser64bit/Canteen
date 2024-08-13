"use client";

import { BriefcaseBusiness, Home, Search, Star, Users } from "lucide-react";
import { Tabs } from "./Tabs";
import { Button } from "./ui/button";

export const Navbar = () => {
  const tabs = [
    {
      title: "Community",
      value: "community",
      icon: <Home />,
    },
    {
      title: "Opportunities",
      value: "opportunities",
      icon: <BriefcaseBusiness />,
    },
    {
      title: "Reviews",
      value: "reviews",
      icon: <Star />,
    },
    {
      title: "Clubs",
      value: "clubs",
      icon: <Users />,
    },
  ];
  return (
    <div className="flex justify-between py-2 border-2">
      <div className="flex items-center">
        <div>
          <img src="/canteen.png" className="w-16 h-16" />
        </div>
        <div className="flex items-center bg-slate-200 rounded-xl px-2">
          <Search className="w-5 h-5 mr-1 text-black" />
          <input
            type="text"
            className="px-2 py-[6px] focus:outline-none bg-slate-200 rounded-xl  text-black font-mono placeholder:opacity-40 placeholder:text-black"
            placeholder="Search"
          />
        </div>
      </div>
      <div className="">
        <Tabs tabs={tabs} />
      </div>
      <div className="flex gap-x-4">
        <Button variant={"secondary"} size={"lg"}>
          Login
        </Button>
        <Button variant={"secondary"} size={"lg"}>
          Sign Up
        </Button>
      </div>
    </div>
  );
};
