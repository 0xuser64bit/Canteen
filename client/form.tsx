"use client";

import { credentialsLogin } from "@/actions/login";
import { credentialsSignUp } from "@/actions/signUp";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
      return;
    }
    if (error?.status) toast.error(error.message);
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
          <Button type="submit">Login</Button>
        </CardFooter>
      </form>
    </>
  );
};

const SignUpForm = () => {
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
  };
  return (
    <form action={handleSignup}>
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
  );
};
export { LoginForm, SignUpForm };
