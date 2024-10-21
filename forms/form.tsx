"use client";

import { credentialsLogin } from "@/actions/user/login";
import { credentialsSignUp } from "@/actions/user/signUp";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { verifyUser } from "@/actions/verifyUser";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";
import { Image } from "lucide-react";
import { useEdgeStore } from "@/lib/edgestore";

const LoginForm = () => {
  const router = useRouter();

  const handleLogin = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    if (!email || !password) {
      toast.info("All fields are required");
      return;
    }
    const error = await credentialsLogin({ email, password });
    if (!error) {
      toast.success("Login successfully");
      router.push("/home");
      // Hack: not refreshing lead to error where the user is not found(need to solve if possible).
      router.refresh();
    } else toast.error(error.message);
  };
  return (
    <>
      <form action={handleLogin}>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="alice.12@gmail.com"
              name="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="******"
              name="password"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            Login
          </Button>
        </CardFooter>
      </form>
    </>
  );
};

const SignUpForm = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const profileImage = useRef<HTMLInputElement | null>(null);
  const [profileURL, setProfileURL] = useState("");
  const [profileImageName, setProfileImageName] = useState("Profile");
  const { edgestore } = useEdgeStore();



  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await edgestore.publicFiles.upload({
      file
    },)
    setProfileURL(url.url);
    setProfileImageName(file.name);
  }

  const handleSignup = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const profile = formData.get("file") as string;
    if (!email || !password || !profile) {
      toast.info("All fields are required");
    }
    // Check if the email is of university
    const university = await verifyUser({ email });
    if (!university) {
      toast.error("Use your university email");
      formRef.current?.reset();
      return;
    }
    const error = await credentialsSignUp({
      email,
      password,
      universityName: university.ValidUniversity.name,
      country: university.ValidUniversity.country,
      countryCode: university.ValidUniversity.alpha_two_code,
      profileImage: profileURL,
    });
    if (!error) {
      toast.success("Register successfully");
      router.push("/home");
    }
    if (error?.status) toast.success(error.message);
    formRef.current?.reset();
  };
  return (
    <>
      <form action={handleSignup} ref={formRef}>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <div className="">
              <input
                type="file"
                name="file"
                id="file"
                ref={profileImage}
                accept="image/png, image/jpeg"
                style={{ display: "none" }}
                onChange={(e) => handleProfileUpload(e)}
              />
              <Button
                type="button"
                variant={"outline"}
                onClick={() => {
                  profileImage.current?.click();
                }}
              >
                <Image className="w-4 h-4 mr-1" /> <span>{profileImageName}</span>
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="alice.12@gmail.com"
              name="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="******"
              name="password"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            Sign Up
          </Button>
        </CardFooter>
      </form>
    </>
  );
};
export { LoginForm, SignUpForm };
