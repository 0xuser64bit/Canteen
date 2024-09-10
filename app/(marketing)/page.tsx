"use client";

import { Hero } from "@/components/Hero";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MarketingPage() {
  const session = await auth();
  if (session?.user) redirect("/community");
  return (
    <>
      <Hero />
    </>
  );
}
