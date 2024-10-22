import { DiscoverSideBar } from "../_components/DiscoverSideBar";
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
    <div className="flex justify-center w-full h-[calc(100vh-160px)]">
      <div className="hidden md:block w-[20%] p-4 sticky top-0 self-start">
        <SidebarTab tabs={navigationTabs} />
      </div>
      <div className="md:w-[65%] w-full h-full overflow-y-auto p-4 no-scrollbar">
        {children}
      </div>
      <div className="hidden md:block w-1/4 p-4 sticky top-0 self-start">
        <DiscoverSideBar />
      </div>
    </div>
  );
}
