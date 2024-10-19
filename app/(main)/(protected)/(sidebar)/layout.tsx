import { Discover } from "../_components/Discover";
import { SidebarTab } from "../_components/SidebarTab";

import { HandHelping, Home, University, Users } from "lucide-react";

const navigationTabs = [
  {
    title: "Home",
    value: "home",
    icon: <Home />,
    path: "/home",
  },
  {
    title: "My University",
    value: "my-university",
    icon: <University />,
    path: "/my-university",
  },
  {
    title: "Opportunities",
    value: "opportunities",
    icon: <HandHelping />,
    path: "/opportunities",
  },
  {
    title: "Community",
    value: "community",
    icon: <Users />,
    path: "/community",
  },
];

export default function SideBarLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex justify-center w-full pt-4">
      <div className="md:block hidden w-1/4 mx-5">
        <SidebarTab tabs={navigationTabs} />
      </div>
      <div className="md:w-1/2 w-full">{children}</div>
      <div className="md:block hidden w-1/4 mx-5">
        <Discover />
      </div>
    </div>
  );
}
