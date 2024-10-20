"use client";

import { updatesUserProfile } from "@/actions/user/updateUserProfile";

import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export const UserProfile = ({
  countryValue,
  countryCodeValue,
  bioValue,
  university,
  country,
}: {
  countryValue: string;
  countryCodeValue: string;
  bioValue: string;
  university: string;
  country: string;
}) => {
  const { data } = useSession();
  const [countryCode, setCountryCode] = useState<string>(countryCodeValue);
  const [bio, setBio] = useState<string>(bioValue);
  const [isSaving, setIsSaving] = useState(false);


  const actionSaveUserData = async () => {
    setIsSaving(true);
    await updatesUserProfile({
      email: data?.user?.email!,
      country: countryValue,
      countryCode: countryCode,
      bio: bio as string,
    })
      .then(() => {
        toast.success("User data saved successfully");
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <>
      <h3 className="font-bold text-xl py-5 text-center">Your Profile</h3>
      <div className="flex flex-col gap-y-2">
        <div>
          <Label htmlFor="universityName" className="font-bold">
            My University
          </Label>
          <Input name="universityName" id="universityName" disabled value={university} />
        </div>

        <div>
          <Label htmlFor="country" className="font-bold">
            Country
          </Label>
          <Input name="country" id="country" disabled value={country} />
        </div>

        <div>
          <Label htmlFor="bio" className="font-bold">
            Bio
          </Label>
          <Textarea
            name="bio"
            id="bio"
            placeholder="Write your bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <Button className="w-full" type="button" onClick={actionSaveUserData}>
          {isSaving ? <Spinner /> : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
