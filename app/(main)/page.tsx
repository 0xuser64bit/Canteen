import { Discover } from "@/components/Discover";
import { Navigation } from "@/components/Navigation";
import { Timeline } from "@/components/Timeline";

export default function Home() {
  return (
    <div className="flex text-center pt-2">
      <div className="w-1/4">
        <Navigation />
      </div>
      <div className="border-2 w-1/2">
        <Timeline />
      </div>
      <div className="w-1/4">
        <Discover />
      </div>
    </div>
  );
}
