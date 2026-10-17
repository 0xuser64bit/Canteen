import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Settings } from "@/components/settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="A little more you" />
      <Settings />
    </>
  );
}
