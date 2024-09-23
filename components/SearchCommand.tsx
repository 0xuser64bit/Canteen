"user client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSearch } from "@/components/hooks/useSearch";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { User } from "lucide-react";

export const SearchCommnad = () => {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const toggle = useSearch((store) => store.toggle);
  const isOpen = useSearch((store) => store.isOpen);
  const onClose = useSearch((store) => store.onClose);

  useEffect(() => {
    // fetch all the clubs/communities from the db.
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  const onSelect = (id: string) => {
    // Todo: redirect to page/club
    router.push(`/`);
    onClose();
  };
  if (!isMounted) {
    return null;
  }

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Find your favorite club or community">
          {/* {data?.map((record) => ( */}
          <CommandItem
          //   key={id}
          //   value={`club-community name`}
          //   title={title}
          //   onSelect={() => onSelect("club/community-id")}
          >
            {false ? (
              <p className="mr-2 text-[18px]">/canteen.png</p>
            ) : (
              <User className="w-4 h-4 mr-2" />
            )}
            <span>{"super club"}</span>
          </CommandItem>
          {/* ))} */}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
