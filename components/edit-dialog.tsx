"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Counter, Input, Textarea } from "@/components/ui/field";
import { LIMITS } from "@/lib/validation";

type Values = { title?: string; body: string };

/** Fixes published text in place; the parent decides whether editing is still open. */
export function EditDialog({
  open,
  onOpenChange,
  what,
  initial,
  bodyOptional = false,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  what: "post" | "reply";
  initial: Values;
  /** A poll's question can stand without text. */
  bodyOptional?: boolean;
  /** Resolves to an error message, or nothing once saved. */
  onSave: (values: Values) => Promise<string | undefined>;
}) {
  const savingRef = useRef(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!savingRef.current) onOpenChange(next);
      }}
    >
      <DialogContent
        title={what === "post" ? "Edit post" : "Edit reply"}
        description="Fix a typo or take out a detail. Others will see that it was edited."
        onOpenAutoFocus={(event) => {
          // Start where the fix usually is: at the end of the text.
          const field = document.getElementById("edit-body");
          if (!(field instanceof HTMLTextAreaElement)) return;
          event.preventDefault();
          field.focus();
          field.setSelectionRange(field.value.length, field.value.length);
        }}
      >
        <EditForm
          what={what}
          initial={initial}
          bodyOptional={bodyOptional}
          onSave={onSave}
          savingRef={savingRef}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  what,
  initial,
  bodyOptional,
  onSave,
  savingRef,
  onDone,
}: {
  what: "post" | "reply";
  initial: Values;
  bodyOptional: boolean;
  onSave: (values: Values) => Promise<string | undefined>;
  savingRef: { current: boolean };
  onDone: () => void;
}) {
  const titled = initial.title !== undefined;
  const [title, setTitle] = useState(initial.title ?? "");
  const [body, setBody] = useState(initial.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const limit = what === "post" ? LIMITS.body.max : LIMITS.comment.max;
  const changed = body !== initial.body || (titled && title !== initial.title);
  const valid =
    (!titled ||
      (title.trim().length >= LIMITS.title.min &&
        title.length <= LIMITS.title.max)) &&
    (bodyOptional || body.trim().length > 0) &&
    body.length <= limit;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!changed || !valid || savingRef.current) return;
    savingRef.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const failure = await onSave(titled ? { title, body } : { body });
        if (failure) setError(failure);
        else {
          savingRef.current = false;
          onDone();
        }
      } catch {
        setError(
          "Couldn't save your edit. Check your connection and try again.",
        );
      } finally {
        savingRef.current = false;
      }
    });
  };

  return (
    <form onSubmit={save}>
      <fieldset disabled={pending} className="flex flex-col gap-2">
        {titled && (
          <>
            <label htmlFor="edit-title" className="text-[13px] font-semibold">
              Title
            </label>
            <Input
              id="edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={LIMITS.title.max + 40}
              autoComplete="off"
            />
          </>
        )}
        <label
          htmlFor="edit-body"
          className={titled ? "mt-2 text-[13px] font-semibold" : "sr-only"}
        >
          {what === "post" ? "Text" : "Reply"}
        </label>
        <Textarea
          id="edit-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={limit + 200}
          className="max-h-[45dvh]"
        />
        <span className="flex justify-end gap-3 px-1">
          {titled && <Counter value={title.length} max={LIMITS.title.max} />}
          <Counter value={body.length} max={limit} />
        </span>
      </fieldset>
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={pending}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          variant="primary"
          disabled={!changed || !valid || pending}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
