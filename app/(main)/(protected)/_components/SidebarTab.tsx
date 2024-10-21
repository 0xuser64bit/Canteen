"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import { Info } from "lucide-react";

type Tab = {
  title: string;
  value: string;
  icon?: React.ReactNode;
  path?: string;
};

export const SidebarTab = ({ tabs }: { tabs: Tab[] }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState<Tab | null>(() => {
    return tabs.find((tab) => tab.path === pathname) || null;
  });

  return (
    <>
      <div className={"flex flex-col"}>
        {tabs.map((tab, _) => (
          <div
            key={tab.title}
            className={cn(
              "flex items-center px-4 py-2 my-1 gap-x-4 text-gray-500 hover:bg-slate-800/10 dark:hover:bg-slate-200/10 hover:rounded-lg",
              active &&
                active.value === tab.value &&
                "bg-gray-200 dark:bg-gray-200/10 rounded-lg ease-in-out text-black dark:text-white font-bold",
            )}
            role="button"
            onClick={() => {
              setActive(tab);
              router.push(tab.path as string);
            }}
          >
            {tab.icon ? tab.icon : <Info />}
            <span className="block">{tab.title}</span>
          </div>
        ))}
      </div>
    </>
  );
};
