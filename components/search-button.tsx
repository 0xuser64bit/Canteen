"use client";

import type { ReactNode } from "react";
import { openSearch } from "@/components/search";
import { Button } from "@/components/ui/button";

export function SearchButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={openSearch}
      aria-label="Search"
    >
      {children}
    </Button>
  );
}
