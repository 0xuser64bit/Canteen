"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import { logout } from "@/actions/user/logout";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { LogOut, User } from "lucide-react";

export const UserAvatar = () => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar role="button">
          <AvatarImage
            src={theme === "dark" ? "/canteen-dark.png" : "/canteen.png"}
          />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48"
        align="end"
        alignOffset={11}
        forceMount
      >
        <div className="flex flex-col">
          <DropdownMenuItem
            asChild
            className="w-full cursor-pointer text-muted-foreground"
          >
            <div
              role="button"
              className="flex w-full select-none items-center p-3 text-sm hover:bg-slate-300/25"
              onClick={() => {
                router.push("/user/profile");
              }}
            >
              <User className="h-4 w-4 mr-2" />
              <span className="line-clamp-1 text-start font-medium">
                Profile
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            asChild
            className="w-full cursor-pointer text-muted-foreground"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <Switch
                id="dark-mode"
                checked={theme === "dark" ? true : false}
                onCheckedChange={() => {
                  theme === "dark" ? setTheme("light") : setTheme("dark");
                }}
              />
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            asChild
            className="w-full cursor-pointer text-muted-foreground"
          >
            <div
              role="button"
              className="flex w-full select-none items-center p-3 text-sm hover:bg-slate-300/25"
              onClick={async () => await logout()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="line-clamp-1 text-start font-medium">
                Sign out
              </span>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
