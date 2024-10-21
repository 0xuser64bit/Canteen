"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const SearchAndCreateOpportunity = ({
  opportunities,
  setOpportunities,
}: {
  opportunities: any;
  setOpportunities: (items: any[]) => void;
}) => {
  const [searchText, setSearchText] = useState("");
  const router = useRouter();
  const handleOpportunitiesSearch = async () => {
    const searchTextArr = searchText.split(" ");
    if (searchText.length === 0) {
      router.refresh();
    }
    let newOpportunities: any[] = [];
    opportunities.map((opportunity: any) => {
      let titleArr = opportunity?.title?.toLowerCase().split(" ") ?? [];
      let descriptionArr =
        opportunity?.description?.toLowerCase().split(" ") ?? [];
      if (
        titleArr.some((word: string) =>
          searchTextArr.includes(word.trim().toLowerCase()),
        ) ||
        descriptionArr.some((word: string) =>
          searchTextArr.includes(word.trim().toLowerCase()),
        )
      ) {
        newOpportunities.push(opportunity);
      }
    });
    setOpportunities(newOpportunities);
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between gap-x-4 items-center">
        <div className="w-full">
          <Input
            className="bg-[#f9f9fb] dark:bg-black dark:bg-opacity-20 py-6 px-4 rounded-full"
            placeholder="Search Opportunity and press enter"
            type="text"
            name="search"
            id="search"
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleOpportunitiesSearch();
              }
            }}
          />
        </div>
        <div>
          <Button
            className="rounded-full dark:bg-slate-400/20 dark:text-white dark:hover:bg-slate-400/10 p-6"
            onClick={() => router.push("/create/opportunity/")}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
};
