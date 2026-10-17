"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
import {
  activateDraftOwner,
  DRAFT_CHANGE,
  DRAFT_OWNER_KEY,
  ownsDraft,
} from "@/lib/draft-storage";

export function DraftBoundary({ owner }: { owner: string }) {
  const router = useRouter();
  useLayoutEffect(() => {
    activateDraftOwner(owner);
    const changed = (event: Event) => {
      if (
        event instanceof StorageEvent &&
        event.key !== null &&
        event.key !== DRAFT_OWNER_KEY
      )
        return;
      if (!ownsDraft(owner)) router.refresh();
    };
    window.addEventListener("storage", changed);
    window.addEventListener(DRAFT_CHANGE, changed);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener(DRAFT_CHANGE, changed);
    };
  }, [owner, router]);
  return null;
}
