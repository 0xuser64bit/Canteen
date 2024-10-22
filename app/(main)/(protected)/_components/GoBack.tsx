"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export const GoBack = () => {
  const router = useRouter();
  return (
    <div
      className="w-8 py-2 px-1 hover:bg-slate-400/30 dark:hover:bg-slate-500/30 rounded-full cursor-pointer"
      role="button"
      onClick={() => router.back()}
    >
      <ArrowLeft className="w-6 h-5 mr-2 text-black dark:text-white" />
    </div>
  );
};
