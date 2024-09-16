"use client";

import { credentialsLogin, login } from "@/actions/login";
import { credentialsSignUp } from "@/actions/signUp";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef } from "react";

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
      router.push("/community");
      // Hack: not refreshing lead to error where the user is not found(need to solve if possible).
      router.refresh();
    } else toast.error(error.message);
  };
  return (
    <>
      <div className="flex justify-center items-centerdark:bg-black dark:bg-white">
        <Button
          onClick={() => {
            login("google")
              .then(() => {
                console.log("Logged in with Google");
              })
              .catch(() => {
                toast.error("Failed to login with Google");
              });
          }}
          type="submit"
        >
          Login with Google
        </Button>
      </div>
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
          <Button type="submit">Login</Button>
        </CardFooter>
      </form>
    </>
  );
};

const SignUpForm = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const handleSignup = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    if (!name || !email || !password) {
      toast.info("All fields are required");
    }
    const error = await credentialsSignUp({ name, email, password });
    if (!error) toast.success("Register successfully");
    if (error?.status) toast.success(error.message);
    formRef.current?.reset();
  };
  return (
    <>
      <div className="flex justify-center items-centerdark:bg-black dark:bg-white">
        <Button
          onClick={() => {
            login("google")
              .then(() => {
                console.log("Logged in with Google");
              })
              .catch(() => {
                toast.error("Failed to login with Google");
              });
          }}
          type="submit"
        >
          Login with Google
        </Button>
      </div>
      <form action={handleSignup} ref={formRef}>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Alice Peterson"
              name="name"
            />
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
          <Button type="submit">Sign Up</Button>
        </CardFooter>
      </form>
    </>
  );
};
export { LoginForm, SignUpForm };
