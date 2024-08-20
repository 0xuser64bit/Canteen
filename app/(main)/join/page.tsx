import { auth } from "@/lib/auth";
import { LoginForm, SignUpForm } from "@/client/form";
import { redirect } from "next/navigation";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function JoinPage() {
  const session = await auth();
  if (session?.user) redirect("/community");
  return (
    <>
      <div className="flex justify-center items-center h-screen dark:bg-black">
        <Tabs defaultValue="login" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
              </CardHeader>
              {/* Login */}
              <LoginForm />
            </Card>
          </TabsContent>
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Sign up</CardTitle>
                <CardDescription>
                  Create an Account to use Canteen
                </CardDescription>
              </CardHeader>
              {/* Register */}
              <SignUpForm />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
