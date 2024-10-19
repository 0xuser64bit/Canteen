"use client";

import { updatesUserProfile } from "@/actions/user/updateUserProfile";

import { Country } from "country-state-city";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Spinner } from "@/components/Spinner";
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
import { useEffect, useState } from "react";

export const UserProfile = ({
  usernameValue,
  countryValue,
  countryCodeValue,
  bioValue,
}: {
  usernameValue: string;
  countryValue: string;
  countryCodeValue: string;
  bioValue: string;
}) => {
  const { data } = useSession();
  const [username, setUsername] = useState<string>(usernameValue);
  const [countryCode, setCountryCode] = useState<string>(countryCodeValue);
  const [bio, setBio] = useState<string>(bioValue);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data?.user?.name) {
      setUsername(data.user.name);
    }
  }, [data?.user?.name]);

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
      <form>
        <div className="py-4 flex flex-col gap-y-4">
          <div>
            <Label htmlFor="username" className="font-bold">
              Username
            </Label>
            <Input name="username" id="username" value={username} disabled />
          </div>
          <div>
            <Label htmlFor="universityName" className="font-bold">
              My University
            </Label>
            <Input name="universityName" id="universityName" disabled />
          </div>
          <div>
            <Label htmlFor="country" className="font-bold">
              Country
            </Label>
            <Select
              name="country"
              value={countryCode}
              onValueChange={(countryCode) => {
                setCountryCode(countryCode);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="E.g. India" />
              </SelectTrigger>
              <SelectContent>
                {Country.getAllCountries().map((country) => (
                  <SelectItem
                    key={country.isoCode}
                    value={country.isoCode ?? "IN"}
                  >
                    {country.name ?? "India"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
      </form >
    </>
  );
}
