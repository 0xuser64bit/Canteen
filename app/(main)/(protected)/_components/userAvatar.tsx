"use client";

import { logout } from "@/actions/logout";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

export const UserAvatar = ({ session }: { session: any }) => {
  const user = session?.data?.user;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar role="button">
          <AvatarImage src={user?.image ?? "/canteen.png"} />
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
              onClick={() => {}}
            >
              <User className="h-4 w-4 mr-2" />
              <span className="line-clamp-1 text-start font-medium">
                Profile
              </span>
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
