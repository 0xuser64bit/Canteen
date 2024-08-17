import { Discover } from "@/app/(main)/(protected)/_components/Discover";
import { Navigation } from "../_components/Navigation";
import { Timeline } from "../_components/Timeline";

export default function CommunityPage() {
  return (
    <div className="flex justify-center pt-2 w-full">
      <div className="w-1/4">
        <Navigation />
      </div>
      <div className="w-1/2 border-2">
        <Timeline />
      </div>
      <div className="w-1/4">
        <Discover />
      </div>
    </div>
  );
}
