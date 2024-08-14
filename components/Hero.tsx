import Image from "next/image";
import { Button } from "./ui/button";

export const Hero = () => {
  return (
    <div className="flex justify-center items-center border">
      <div>
        <Image
          src={"/canteen-dark.png"}
          className="dark:block hidden"
          width={400}
          height={400}
          alt="not found"
        />
        <Image
          src={"/canteen.png"}
          className="block dark:hidden"
          width={400}
          height={400}
          alt="not found"
        />
      </div>
      <div className="flex flex-col">
        <div className="text-center">
          <span className="text-4xl font-bold">Join Passionate Students</span>
          <br />
          <span className="text-4xl font-bold">Just Like You</span>
        </div>
        <div className="flex flex-col gap-y-2 pt-10">
          <Button variant={"secondary"} size={"lg"}>
            Login
          </Button>
          <Button variant={"secondary"} size={"lg"}>
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  );
};
