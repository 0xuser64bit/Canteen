import Image from "next/image";
import { Button } from "./ui/button";
import { BackgroundBeams } from "./ui/background-beams";

export const Hero = () => {
  return (
    <div className="flex justify-center items-center h-screen gap-x-6 dark:bg-black">
      <div className="">
        <Image
          src={"/canteen-dark.png"}
          className="dark:block hidden scale-125"
          width={400}
          height={400}
          alt="not found"
        />
        <Image
          src={"/canteen.png"}
          className="block dark:hidden scale-125"
          width={400}
          height={400}
          alt="not found"
        />
      </div>
      <div className="flex flex-col">
        <div className="text-center dark:text-white">
          <span className="text-4xl font-bold">Join Passionate Students</span>
          <br />
          <span className="text-4xl font-bold">Just Like You</span>
        </div>
        <div className="flex flex-col gap-y-2 pt-10">
          <Button className="z-[99999]" variant={"secondary"} size={"lg"}>
            Login
          </Button>
          <Button className="z-[99999]" variant={"secondary"} size={"lg"}>
            Sign Up
          </Button>
        </div>
      </div>
      <BackgroundBeams />
    </div>
  );
};
