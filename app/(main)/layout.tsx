"use client";

import { SearchCommnad } from "@/components/SearchCommand";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(localStorage.getItem("theme") ?? "dark");
  });

  return (
    <div>
      <SearchCommnad />
      {children}
    </div>
  );
}
