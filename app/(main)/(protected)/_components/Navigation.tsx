import { GraduationCap, LayoutGrid, Library, Vote } from "lucide-react";
import { NavigationTabs } from "./NavigationTabs";

export const Navigation = () => {
  const navigationTabs = [
    {
      title: "Feed",
      value: "feed",
      icon: <Library />,
    },
    {
      title: "My University",
      value: "myUniversity",
      icon: <GraduationCap />,
    },
    {
      title: "Polls",
      value: "polls",
      icon: <Vote />,
    },
    {
      title: "All Channels",
      value: "allChannels",
      icon: <LayoutGrid />,
    },
  ];
  return (
    <div>
      <NavigationTabs navigationTabs={navigationTabs} />
    </div>
  );
};
