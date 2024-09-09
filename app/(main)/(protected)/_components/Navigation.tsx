import { GraduationCap, LayoutGrid, Library, Vote } from "lucide-react";
import { NavigationTabs } from "./NavigationTabs";

export const Navigation = () => {
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
  return (
    <div>
      <NavigationTabs navigationTabs={navigationTabs} />
    </div>
  );
};
