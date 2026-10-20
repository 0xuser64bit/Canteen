"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { threadHref } from "@/lib/return-to";

/** Keep the reading context in the URL, including across refresh and reply pages. */
export function ThreadLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: `/p/${string}` }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const from = pathname.startsWith("/p/")
    ? (search.get("from") ?? "/campus")
    : `${pathname}${search.size ? `?${search}` : ""}`;
  return <Link {...props} href={threadHref(href, from)} />;
}
