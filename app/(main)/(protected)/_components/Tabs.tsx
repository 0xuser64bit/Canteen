"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import { Info } from "lucide-react";

type Tab = {
  title: string;
  value: string;
  icon?: React.ReactNode;
  redirect?: string;
};

export const Tabs = ({ tabs }: { tabs: Tab[] }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState<Tab | null>();
  useEffect(() => {
    setActive(tabs.find((tab) => tab.redirect === pathname) || null);
  }, [pathname]);

  return (
    <>
      <div
        className={cn(
          "flex justify-center items-center overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full",
        )}
      >
        {tabs.map((tab, _) => (
          <div
            key={tab.title}
            className={cn(
              "flex flex-col justify-center items-center px-8 py-2 rounded-full",
              active &&
                active.value === tab.value &&
                "bg-gray-200 dark:bg-gray-200/10 rounded-lg ease-in-out",
            )}
            role="button"
            onClick={() => {
              setActive(tab);
              router.push(tab?.redirect as string);
            }}
          >
            {tab.icon ? tab.icon : <Info className="w-4 h-4" />}
            <span className="block text-black dark:text-white">
              {tab.title}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};
