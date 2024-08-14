import Image from "next/image";
import { Button } from "./ui/button";
import { BackgroundBeams } from "./ui/background-beams";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const WaitList = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleWaitlistSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    fetch("api/waitlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    })
      .then((res) => {
        if (res.ok) toast.success("Thank you for joining our waitlist! 🚀");
        else if (res.status === 409)
          toast.info("Email already exists in our waitlist!");
        else toast.error("Oops! Something went wrong!");
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setEmail("");
        setLoading(false);
      });
  };
  return (
    <form onSubmit={handleWaitlistSubmit} method="POST">
      <div className="flex justify-center items-center h-screen gap-x-6 bg-black">
        <div className="">
          <Image
            src={"/canteen-dark.png"}
            className="scale-125"
            width={400}
            height={400}
            alt="not found"
          />
        </div>
        <div className="flex flex-col">
          <div className="text-center text-white">
            <span className="text-4xl font-bold">Join the waitlist</span>
            <br />
            <span className="text-4xl font-bold">
              Secure you spot in canteen.
            </span>
          </div>
          <div className="flex flex-col gap-y-2 pt-10">
            <div className="flex w-full max-w-sm items-center space-x-2 z-[9999]">
              <input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm
               ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium 
               placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 
               focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed 
               disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 
               dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300`}
              />
              <Button variant={"outline"} type="submit">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Subscribe"
                )}
              </Button>
            </div>
          </div>
        </div>
        <BackgroundBeams />
      </div>
    </form>
  );
};
