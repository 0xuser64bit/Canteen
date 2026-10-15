"use client";

import { LogOut, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
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
import { cn } from "@/lib/utils";
import { DELETE_CONFIRMATION } from "@/lib/validation";
import { deleteAccount } from "@/server/actions";

const noop = () => () => {};

export function ThemeChooser() {
  const { theme, setTheme } = useTheme();
  // The stored theme only exists in the browser; render neutral on the server.
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const options = [
    { id: "system", label: "Auto", icon: Monitor },
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-full bg-surface-2 p-1 ring-1 ring-line"
    >
      {options.map((option) => {
        const checked = hydrated && theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => setTheme(option.id)}
            className={cn(
              "flex h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink",
              checked && "bg-surface text-ink shadow-soft ring-1 ring-line",
            )}
          >
            <option.icon className="size-4" /> {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          router.replace("/");
          router.refresh();
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
