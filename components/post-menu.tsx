"use client";

import { Flag, Link2, MoreHorizontal, Share, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { deleteComment, deletePost, reportContent } from "@/server/actions";

export const POST_DELETED = "canteen:post-deleted";

async function share(path: string, title: string) {
  const url = new URL(path, window.location.origin).toString();
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ title, url });
      return;
    } catch {
      // The share sheet was dismissed; fall back to copying.
    }
  }
  await navigator.clipboard.writeText(url);
  toast.success("Link copied");
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
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await reportContent({ target, id, reason: reason ?? "" });
      if (!result.ok) return void toast.error(result.error);
      onOpenChange(false);
      toast.success("Thanks. We'll take a look.", {
        description:
          "Content that several students report is hidden automatically.",
      });
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Report this ${target === "post" ? "post" : "reply"}`}
        description="Reports are anonymous. The author never finds out who reported them."
      >
        <div
          role="radiogroup"
          aria-label="Reason"
          className="flex flex-col gap-1.5"
        >
          {REPORT_REASONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={reason === option.id}
              onClick={() => setReason(option.id)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-medium ring-1 ring-line transition-colors ring-inset hover:bg-surface-3",
                reason === option.id && "bg-surface-3 ring-2 ring-ink",
              )}
            >
              <span
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
            </button>
          ))}
        </div>
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
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
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
  onConfirm: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Delete this ${what}?`}
        description={
          what === "post"
            ? "It disappears for everyone, along with its replies. This can't be undone."
            : "It disappears for everyone. This can't be undone."
        }
      >
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Keep it</Button>
          </DialogClose>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => startTransition(onConfirm)}
          >
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
  post: { id: string; title: string; isMine: boolean };
  onYellow?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [dialog, setDialog] = useState<"report" | "delete" | null>(null);

  const remove = async () => {
    const result = await deletePost(post.id);
    if (!result.ok) return void toast.error(result.error);
    setDialog(null);
    toast.success("Post deleted");
    window.dispatchEvent(new CustomEvent(POST_DELETED, { detail: post.id }));
    if (pathname === `/p/${post.id}`) router.replace("/home");
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
              "relative z-10 grid size-8 cursor-pointer place-items-center rounded-full transition-colors",
              onYellow
                ? "hover:bg-you-ink/10"
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
              await navigator.clipboard.writeText(
                new URL(`/p/${post.id}`, window.location.origin).toString(),
              );
              toast.success("Link copied");
            }}
          >
            <Link2 /> Copy link
          </DropdownMenuItem>
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
    if (!result.ok) return void toast.error(result.error);
    setDialog(null);
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Reply actions"
            className="grid size-7 cursor-pointer place-items-center rounded-full text-muted opacity-100 transition-[opacity,background-color] hover:bg-surface-3 hover:text-ink focus-visible:opacity-100 data-[state=open]:opacity-100 sm:opacity-0 sm:group-hover/reply:opacity-100"
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
