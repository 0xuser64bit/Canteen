"use client";

import {
  Bookmark,
  Bell,
  Flag,
  Link2,
  MoreHorizontal,
  Share,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { REPORT_REASONS } from "@/lib/validation";
import {
  deleteComment,
  deletePost,
  reportContent,
  setCollection,
} from "@/server/actions";

export const POST_DELETED = "canteen:post-deleted";

async function copyToClipboard(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("Couldn't copy the link. Try sharing it from your browser.");
  }
}

/** The share sheet on phones; on desktops, copies the text and link instead. */
export async function share(
  path: string,
  title: string,
  { text, copied = "Link copied" }: { text?: string; copied?: string } = {},
) {
  const url = new URL(path, window.location.origin).toString();
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      // Copy when sharing is unavailable, but respect a dismissed share sheet.
    }
  }
  await copyToClipboard(text ? `${text} ${url}` : url, copied);
}

export function ReportDialog({
  target,
  id,
  open,
  onOpenChange,
}: {
  target: "post" | "comment";
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const reasonGroup = useId();

  const submit = () => {
    if (!reason || submitting.current) return;
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await reportContent({ target, id, reason });
        if (!result.ok) return setError(result.error);
        onOpenChange(false);
        toast.success("Thanks. We'll take a look.", {
          description:
            "Content that several students report is hidden automatically.",
        });
      } catch {
        setError(
          "Couldn't confirm your report. Check your connection and try again.",
        );
      } finally {
        submitting.current = false;
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting.current) return;
        setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent
        title={`Report this ${target === "post" ? "post" : "reply"}`}
        description="Reports are anonymous. The author never finds out who reported them."
      >
        <fieldset disabled={pending} className="flex flex-col gap-1.5">
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map((option) => (
            <label key={option.id}>
              <input
                type="radio"
                name={reasonGroup}
                value={option.id}
                checked={reason === option.id}
                onChange={() => {
                  setReason(option.id);
                  setError(null);
                }}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-medium ring-1 ring-line transition-colors ring-inset peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-default hover:bg-surface-3",
                  reason === option.id && "bg-surface-3 ring-2 ring-ink",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full ring-2 ring-line-strong",
                    reason === option.id && "ring-ink",
                  )}
                >
                  {reason === option.id && (
                    <span className="size-2.5 rounded-full bg-ink" />
                  )}
                </span>
                {option.label}
              </span>
            </label>
          ))}
        </fieldset>
        {reason === "SELF_HARM" && (
          <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-[13px] leading-relaxed text-muted">
            If someone is in immediate danger, contact local emergency services.
            You can find a free, confidential helpline near you at{" "}
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-ink underline"
            >
              findahelpline.com
            </a>
            .
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            disabled={!reason || pending}
            onClick={submit}
          >
            {pending ? "Sending…" : "Send report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDelete({
  open,
  onOpenChange,
  what,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  what: "post" | "reply";
  onConfirm: () => Promise<string | undefined>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const confirm = () => {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      try {
        setError((await onConfirm()) ?? null);
      } catch {
        setError(
          "Couldn't confirm deletion. Check your connection and try again.",
        );
      } finally {
        submitting.current = false;
      }
    });
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting.current) return;
        setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent
        title={`Delete this ${what}?`}
        description={
          what === "post"
            ? "It disappears for everyone, along with its replies. This can't be undone."
            : "It disappears for everyone. This can't be undone."
        }
      >
        {error && (
          <p role="alert" className="mb-4 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Keep it
            </Button>
          </DialogClose>
          <Button variant="danger" disabled={pending} onClick={confirm}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PostMenu({
  post,
  onYellow,
}: {
  post: {
    id: string;
    title: string;
    isMine: boolean;
    saved: boolean;
    following: boolean;
  };
  onYellow?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collections, setCollections] = useState({
    source: post,
    saved: post.saved,
    following: post.following,
  });
  if (collections.source !== post)
    setCollections({
      source: post,
      saved: post.saved,
      following: post.following,
    });
  const [pending, startTransition] = useTransition();
  const collectionPending = useRef(false);
  const [dialog, setDialog] = useState<"report" | "delete" | null>(null);

  const remove = async () => {
    const result = await deletePost(post.id);
    if (!result.ok) return result.error;
    setDialog(null);
    toast.success("Post deleted");
    window.dispatchEvent(new CustomEvent(POST_DELETED, { detail: post.id }));
    if (pathname === `/p/${post.id}`) router.replace("/campus");
    else router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className={cn(
              "relative z-10 -my-1.5 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition-colors",
              onYellow
                ? "hover:bg-you-surface-ink/10"
                : "text-muted hover:bg-surface-3 hover:text-ink",
            )}
          >
            <MoreHorizontal className="size-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => share(`/p/${post.id}`, post.title)}>
            <Share /> Share
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={async () => {
              await copyToClipboard(
                new URL(`/p/${post.id}`, window.location.origin).toString(),
                "Link copied",
              );
            }}
          >
            <Link2 /> Copy link
          </DropdownMenuItem>
          {(post.isMine
            ? (["saved"] as const)
            : (["saved", "following"] as const)
          ).map((collection) => (
            <DropdownMenuItem
              key={collection}
              disabled={pending}
              onSelect={() => {
                if (collectionPending.current) return;
                collectionPending.current = true;
                const enabled = !collections[collection];
                startTransition(async () => {
                  try {
                    const result = await setCollection(
                      post.id,
                      collection,
                      enabled,
                    );
                    if (!result.ok) toast.error(result.error);
                    else {
                      setCollections((current) => ({
                        ...current,
                        [collection]: enabled,
                      }));
                      toast.success(
                        collection === "saved"
                          ? enabled
                            ? "Saved privately"
                            : "Removed from saved"
                          : enabled
                            ? "You'll get reply alerts"
                            : "Reply alerts off",
                      );
                    }
                  } catch {
                    toast.error(
                      "Couldn't confirm that change. Check your connection and try again.",
                    );
                  } finally {
                    collectionPending.current = false;
                  }
                });
              }}
            >
              {collection === "saved" ? <Bookmark /> : <Bell />}
              {collection === "saved"
                ? collections.saved
                  ? "Unsave"
                  : "Save privately"
                : collections.following
                  ? "Unfollow replies"
                  : "Follow replies"}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {post.isMine ? (
            <DropdownMenuItem destructive onSelect={() => setDialog("delete")}>
              <Trash2 /> Delete post
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setDialog("report")}>
              <Flag /> Report
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        target="post"
        id={post.id}
        open={dialog === "report"}
        onOpenChange={(o) => setDialog(o ? "report" : null)}
      />
      <ConfirmDelete
        what="post"
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
        onConfirm={remove}
      />
    </>
  );
}

export function CommentMenu({ id, isMine }: { id: string; isMine: boolean }) {
  const [dialog, setDialog] = useState<"report" | "delete" | null>(null);
  const remove = async () => {
    const result = await deleteComment(id);
    if (!result.ok) return result.error;
    setDialog(null);
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Reply actions"
            className="-mx-2 -my-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-muted opacity-100 transition-[opacity,background-color] hover:bg-surface-3 hover:text-ink focus-visible:opacity-100 data-[state=open]:opacity-100 sm:opacity-0 sm:group-hover/reply:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isMine ? "end" : "start"}>
          {isMine ? (
            <DropdownMenuItem destructive onSelect={() => setDialog("delete")}>
              <Trash2 /> Delete reply
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setDialog("report")}>
              <Flag /> Report reply
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        target="comment"
        id={id}
        open={dialog === "report"}
        onOpenChange={(o) => setDialog(o ? "report" : null)}
      />
      <ConfirmDelete
        what="reply"
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
        onConfirm={remove}
      />
    </>
  );
}
