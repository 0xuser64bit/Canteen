"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

type NavigationTab = {
  title: string;
  value: string;
  icon?: React.ReactNode;
};

export const NavigationTabs = ({
  navigationTabs,
}: {
  navigationTabs: NavigationTab[];
}) => {
  const [active, setActive] = useState<NavigationTab>(navigationTabs?.[0]);
  return (
    <>
      <div className={cn("flex flex-col")}>
        {navigationTabs.map((navigationTab, _) => (
          <div
            key={navigationTab.title}
            className={cn(
              "flex items-center px-4 sm:px-8 md:px-16 py-2 gap-x-4 text-gray-500",
              active.value === navigationTab.value &&
                "bg-gray-200 rounded-lg ease-in-out text-black font-bold",
            )}
            role="button"
            onClick={() => {
              setActive(navigationTab);
            }}
          >
            {navigationTab.icon ? navigationTab.icon : <Info />}
            <span className="block dark:text-white">{navigationTab.title}</span>
          </div>
        ))}
      </div>
    </>
  );
};
