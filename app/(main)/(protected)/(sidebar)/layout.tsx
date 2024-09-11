import { Discover } from "../_components/Discover";
import { Navigation } from "../_components/Navigation";

import { GraduationCap, LayoutGrid, Library, Vote } from "lucide-react";

const navigationTabs = [
  {
    title: "Feed",
    value: "feed",
    icon: <Library />,
    path: "/community",
  },
  {
    title: "My University",
    value: "myUniversity",
    icon: <GraduationCap />,
    path: "/my-university",
  },
  {
    title: "Polls",
    value: "polls",
    icon: <Vote />,
    path: "/polls",
  },
  {
    title: "All Channels",
    value: "allChannels",
    icon: <LayoutGrid />,
    path: "/all",
  },
];

export default function SideBarLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex justify-center pt-2 w-full">
      <div className="w-1/4">
        <Navigation navigationTabs={navigationTabs} />
      </div>
      <div className="w-1/2 mx-2">{children}</div>
      <div className="w-1/4">
        <Discover />
      </div>
    </div>
  );
}
