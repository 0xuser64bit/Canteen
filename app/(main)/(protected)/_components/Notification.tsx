import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";

export const Notification = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="hover:bg-slate-200 p-2 rounded-full cursor-pointer">
          <Bell />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80"
        align="end"
        alignOffset={11}
        forceMount
      >
        <DropdownMenuLabel>
          <div className="flex justify-between items-center py-2">
            <p>Notifications</p>
            <div role="button" onClick={() => {}}>
              See All
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex flex-col">
          {/* TODO: loop by fetching notification */}
          <DropdownMenuItem
            asChild
            className="w-full cursor-pointer text-muted-foreground"
          >
            <div
              role="button"
              className="flex w-full select-none items-center p-3 text-sm hover:bg-slate-300/25"
              onClick={() => {}}
            >
              <span className="line-clamp-1 text-start font-medium">
                Profile
              </span>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
