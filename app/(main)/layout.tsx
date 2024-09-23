"use client";

import { SearchCommnad } from "@/components/SearchCommand";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <SearchCommnad />
      {children}
    </div>
  );
}
