"use client";

import { Separator } from "@/components/ui/separator";
import { Eye } from "lucide-react";

export const Discover = () => {
  return (
    <>
      <div className="border px-5">
        <span className="font-semibold text-sm text-slate-500">
          Popular post
        </span>
        <ul>
          <div
            className="py-2 hover:underline"
            role="button"
            onClick={() => {}}
          >
            <li className="flex gap-x-2 items-center justify-between pb-2">
              <p className="font-semibold text-sm">
                Join Meta IC6 or stay PMT at Amazon
              </p>
              <Eye className="w-4 h-4 text-slate-400" />
            </li>
            <Separator />
          </div>
        </ul>
      </div>
    </>
  );
};
