"use client";

import { LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { DELETE_CONFIRMATION } from "@/lib/validation";
import { deleteAccount } from "@/server/actions";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await authClient.signOut();
            if (result.error) {
              toast.error("Couldn't sign out. Try again.");
              return;
            }
            router.replace("/");
            router.refresh();
          } catch {
            toast.error(
              "Couldn't sign out. Check your connection and try again.",
            );
          }
        })
      }
    >
      <LogOut /> {pending ? "Signing out" : "Sign out"}
    </Button>
  );
}

export function DeleteAccountButton() {
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();
  const matches = confirmation.trim().toLowerCase() === DELETE_CONFIRMATION;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-danger hover:bg-danger-surface hover:text-danger"
        >
          <Trash2 /> Delete account
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Delete your account?"
        description="This permanently deletes your account and everything you posted: posts, replies, likes, and images. There's no undo."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await deleteAccount(confirmation);
              if (result && !result.ok) toast.error(result.error);
            });
          }}
        >
          <label
            htmlFor="confirm-delete"
            className="mb-2 block text-[14px] text-muted"
          >
            Type{" "}
            <span className="font-semibold text-ink">
              {DELETE_CONFIRMATION}
            </span>{" "}
            to confirm.
          </label>
          <Input
            id="confirm-delete"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            autoCapitalize="off"
          />
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="danger"
              disabled={!matches || pending}
            >
              {pending ? "Deleting…" : "Delete forever"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
