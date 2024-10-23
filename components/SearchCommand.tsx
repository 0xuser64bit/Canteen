"user client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { University } from "lucide-react";

import { useSearch } from "@/components/hooks/useSearch";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getUniversityofAllCurrentUsers } from "@/actions/user/getUniversityofAllCurrentUser";

export const SearchCommnad = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [universities, setUniversities] = useState<any[]>([]);
  const router = useRouter();

  const toggle = useSearch((store) => store.toggle);
  const isOpen = useSearch((store) => store.isOpen);
  const onClose = useSearch((store) => store.onClose);

  useEffect(() => {
    const universities = async () => {
      const allUniversities = await getUniversityofAllCurrentUsers();
      setUniversities(allUniversities);
    };
    universities();
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

  const onSelect = (name: string) => {
    router.push(`university/${name.split(" ").join("-")}`);
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
        <CommandGroup heading="Search for university...">
          {universities &&
            universities.map((university) => (
              <CommandItem
                key={university}
                onSelect={() => onSelect(university)}
              >
                <University className="w-4 h-4 mr-2" />
                <span>{university}</span>
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
