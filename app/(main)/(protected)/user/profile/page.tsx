"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function UserProfilePage() {
  const { data } = useSession();
  const [username, setUsername] = useState<string>();
  useEffect(() => {
    setUsername(data?.user?.name!);
  }, [username]);

  const actionSaveUserDate = async (formDate: FormData) => {
    // TODO: validate and save user data to db
    toast.success("User data saved successfully");
  };
  return (
    <div className="mx-auto w-1/2">
      <h3 className="font-bold text-xl py-5">Your Profile</h3>
      <form action={actionSaveUserDate}>
        <div className="py-4 flex flex-col gap-y-4">
          <div>
            {/* it will already have value(username) */}
            <Label htmlFor="username" className="font-bold">
              Username
            </Label>
            <Input name="username" id="username" value={username as string} />
          </div>
          <div>
            <Label htmlFor="universityName" className="font-bold">
              My University
            </Label>
            <Input name="universityName" id="universityName" disabled />
          </div>
          <div>
            {/* Todo: make both dropdown dynamic */}
            <Label htmlFor="country" className="font-bold">
              Country
            </Label>
            <Select name="country">
              <SelectTrigger>
                <SelectValue placeholder="E.g. India" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">India</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            {/* Todo: if country selected to india then only indian city should be visible in dropdown */}
            <Label htmlFor="city" className="font-bold">
              City
            </Label>
            <Select name="city">
              <SelectTrigger>
                <SelectValue placeholder="E.g. Mumbai" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ahmedabad">Ahmedabad</SelectItem>
                <SelectItem value="mumbai">Mumbai</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bio" className="font-bold">
              Bio
            </Label>
            <Textarea name="bio" id="bio" placeholder="Write your bio" />
          </div>
          <Button className="w-full" type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
