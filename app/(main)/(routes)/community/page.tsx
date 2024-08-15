import { Discover } from "@/components/Discover";
import { Navigation } from "@/components/Navigation";
import { Timeline } from "@/components/Timeline";

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
