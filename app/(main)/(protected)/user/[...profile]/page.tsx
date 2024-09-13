"use client";

import { updatesUserProfile } from "@/actions/updateUserProfile";

import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Country, State, City, IState, ICity } from "country-state-city";

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
import { useState, useEffect } from "react";

export default function UserProfilePage() {
  const { data } = useSession();
  const [username, setUsername] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  useEffect(() => {
    if (data?.user?.name) {
      setUsername(data.user.name);
    }
  }, [data?.user?.name]);

  const getFullLocationNames = () => {
    const fullCountry = Country.getCountryByCode(country);
    const fullState = State.getStateByCodeAndCountry(selectedState, country);
    const fullCity = City.getCitiesOfState(country, selectedState).find(
      (city) => city.name === selectedCity,
    );

    return {
      countryName: fullCountry?.name || "",
      stateName: fullState?.name || "",
      cityName: fullCity?.name || selectedCity, // fallback to selectedCity if not found
    };
  };

  const actionSaveUserDate = async (formData: FormData) => {
    const { countryName, stateName, cityName } = getFullLocationNames();
    const username = formData.get("username");
    const universityName = formData.get("universityName");
    const bio = formData.get("bio");

    updatesUserProfile({
      email: data?.user?.email!,
      username: username as string,
      university: universityName as string,
      country: countryName,
      state: stateName,
      city: cityName,
      bio: bio as string,
    }).then(() => {
      toast.success("User data saved successfully");
    });
  };

  return (
    <div className="mx-auto w-1/2">
      <h3 className="font-bold text-xl py-5">Your Profile</h3>
      <form action={actionSaveUserDate}>
        <div className="py-4 flex flex-col gap-y-4">
          <div>
            <Label htmlFor="username" className="font-bold">
              Username
            </Label>
            <Input
              name="username"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
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
              value={country}
              onValueChange={(countryCode) => {
                setStates(State.getStatesOfCountry(countryCode));
                setCountry(countryCode);
                setSelectedState("");
                setSelectedCity("");
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
          <div className="flex gap-x-4">
            <div className="w-full">
              <Label htmlFor="state" className="font-bold">
                State
              </Label>
              <Select
                name="state"
                value={selectedState}
                onValueChange={(state) => {
                  setSelectedState(state);
                  if (country) {
                    setCities(City.getCitiesOfState(country, state));
                  }
                  setSelectedCity("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="E.g. Gujarat" />
                </SelectTrigger>
                <SelectContent>
                  {states?.map((state) => (
                    <SelectItem key={state.isoCode} value={state.isoCode ?? ""}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <Label htmlFor="city" className="font-bold">
                City
              </Label>
              <Select
                name="city"
                value={selectedCity}
                onValueChange={(city) => setSelectedCity(city)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="E.g. Ahmedabad" />
                </SelectTrigger>
                <SelectContent>
                  {cities?.map((city) => (
                    <SelectItem key={city.name} value={city.name ?? ""}>
                      {city.name}
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
          <Button className="w-full" type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
