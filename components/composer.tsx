"use client";

import {
  Globe,
  ImagePlus,
  ListChecks,
  Loader2,
  Lock,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { HelplineNote } from "@/components/helpline";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/datetime-field";
import { Counter, FieldError } from "@/components/ui/field";
import { parseLocalDateTime } from "@/lib/datetime";
import {
  DRAFT_CHANGE,
  DRAFT_OWNER_KEY,
  ownsDraft,
  readDraft,
  writeDraft,
} from "@/lib/draft-storage";
import type { Audience, PostKind, Topic } from "@/lib/generated/prisma/enums";
import { TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { LIMITS } from "@/lib/validation";
import { createPost, type ComposeState } from "@/server/actions";

type PreparedImage = {
  file: File;
  preview: string;
};

/**
 * Redraws the photo onto a canvas and exports a fresh file. The new file has
 * no EXIF block, so GPS coordinates and camera details never leave the device.
 */
async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    LIMITS.imageEdge / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, quality),
    );
  let blob = await encode("image/webp", 0.86);
  // Browsers without a WebP encoder silently fall back to PNG; use JPEG instead.
  if (!blob || blob.type !== "image/webp")
    blob = await encode("image/jpeg", 0.88);
  if (!blob) throw new Error("encode failed");

  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return {
    file: new File([blob], `image.${extension}`, { type: blob.type }),
    preview: URL.createObjectURL(blob),
  };
}

function Choice({
  checked,
  onSelect,
  children,
  className,
}: {
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={checked ? 0 : -1}
      onKeyDown={(event) => {
        const keys = [
          "ArrowRight",
          "ArrowDown",
          "ArrowLeft",
          "ArrowUp",
          "Home",
          "End",
        ];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const radios = [
          ...event.currentTarget
            .closest('[role="radiogroup"]')!
            .querySelectorAll<HTMLButtonElement>('[role="radio"]'),
        ];
        const current = radios.indexOf(event.currentTarget);
        const index =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? radios.length - 1
              : (current +
                  (event.key === "ArrowLeft" || event.key === "ArrowUp"
                    ? -1
                    : 1) +
                  radios.length) %
                radios.length;
        radios[index]?.focus();
        radios[index]?.click();
      }}
      onClick={onSelect}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 transition-colors ring-inset",
        checked
          ? "bg-ink text-background ring-ink"
          : "bg-surface text-muted ring-line hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Composer({
  draftOwner,
  university,
  initialTopic,
  imagesEnabled,
  hostCampus,
}: {
  draftOwner: string;
  university: string;
  initialTopic: Topic;
  imagesEnabled: boolean;
  hostCampus?: string;
}) {
  const router = useRouter();
  const [state, dispatch, pending] = useActionState<ComposeState, FormData>(
    createPost,
    null,
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PostKind>("QUESTION");
  const [topic, setTopic] = useState<Topic>(initialTopic);
  const [audience, setAudience] = useState<Audience>("CAMPUS");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const submissionId = useRef("");
  const [poll, setPoll] = useState<string[] | null>(null);
  const [imageError, setImageError] = useState<string>();
  const [preparing, setPreparing] = useState(false);
  const [restored, setRestored] = useState(false);
  const [invalidated, setInvalidated] = useState(false);
  const invalidatedRef = useRef(false);
  const [missingImage, setMissingImage] = useState(false);
  const restoreStarted = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Restore a draft once, after hydration (storage doesn't exist on the server).
  useEffect(() => {
    if (restoreStarted.current) return;
    restoreStarted.current = true;
    const draft = readDraft(draftOwner, hostCampus);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage
    if (draft.title) setTitle(draft.title);
    if (draft.body) setBody(draft.body);
    if (draft.kind) setKind(draft.kind);
    if (draft.topic) setTopic(draft.topic);
    if (draft.audience) setAudience(draft.audience);
    if (draft.applicationUrl) setApplicationUrl(draft.applicationUrl);
    if (draft.deadline) setDeadline(draft.deadline);
    if (draft.poll) setPoll(draft.poll);
    if (draft.imageAlt) setImageAlt(draft.imageAlt);
    setMissingImage(!!draft.imageAlt);
    submissionId.current = draft.submissionId ?? crypto.randomUUID();
    setRestored(true);
  }, [draftOwner, hostCampus]);

  useEffect(() => {
    const changed = (event: Event) => {
      if (
        event instanceof StorageEvent &&
        event.key !== null &&
        event.key !== DRAFT_OWNER_KEY
      )
        return;
      if (!ownsDraft(draftOwner)) {
        invalidatedRef.current = true;
        setInvalidated(true);
        setTitle("");
        setBody("");
        setKind("QUESTION");
        setTopic(initialTopic);
        setAudience("CAMPUS");
        setApplicationUrl("");
        setDeadline("");
        setPoll(null);
        setImage(null);
        setImageAlt("");
        setImageError(undefined);
        setMissingImage(false);
        setRestored(false);
      }
    };
    window.addEventListener("storage", changed);
    window.addEventListener(DRAFT_CHANGE, changed);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener(DRAFT_CHANGE, changed);
    };
  }, [draftOwner, hostCampus, initialTopic]);

  // Saves as you type, and again if the server rejects a submit (state changes).
  useEffect(() => {
    if (restored && !state?.postedId)
      writeDraft(
        draftOwner,
        {
          title,
          body,
          kind,
          topic,
          audience,
          applicationUrl,
          deadline,
          poll,
          imageAlt,
          submissionId: submissionId.current,
        },
        hostCampus,
      );
  }, [
    draftOwner,
    hostCampus,
    title,
    body,
    kind,
    topic,
    audience,
    applicationUrl,
    deadline,
    poll,
    imageAlt,
    state,
    restored,
  ]);

  useEffect(() => {
    if (!state?.postedId) return;
    writeDraft(draftOwner, null, hostCampus);
    router.push(`/p/${state.postedId}`);
    router.refresh();
  }, [draftOwner, hostCampus, state?.postedId, router]);

  useEffect(
    () => () => void (image && URL.revokeObjectURL(image.preview)),
    [image],
  );

  const pickImage = async (file: File | undefined) => {
    setImageError(undefined);
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return setImageError("Pick an image file.");
    setPreparing(true);
    try {
      const prepared = await prepareImage(file);
      if (invalidatedRef.current) {
        URL.revokeObjectURL(prepared.preview);
        return;
      }
      if (prepared.file.size > LIMITS.imageBytes) {
        URL.revokeObjectURL(prepared.preview);
        setImageError("That image is too large even after compressing.");
      } else {
        setImage(prepared);
        setMissingImage(false);
      }
    } catch {
      setImageError("We couldn't read that image. Try a JPEG or PNG.");
    } finally {
      setPreparing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (invalidatedRef.current || pending || preparing || !ready) return;
    const form = new FormData();
    form.set("draftOwner", draftOwner);
    form.set("id", submissionId.current);
    if (hostCampus) form.set("hostCampus", hostCampus);
    form.set("title", title);
    form.set("body", body);
    form.set("kind", topic === "OPPORTUNITIES" ? "DISCUSSION" : kind);
    form.set("topic", topic);
    form.set("audience", audience);
    if (topic === "OPPORTUNITIES") {
      form.set("applicationUrl", applicationUrl);
      const date = parseLocalDateTime(deadline);
      form.set("deadline", date ? date.toISOString() : "");
    }
    poll?.forEach((choice) => form.append("pollChoice", choice));
    if (image) {
      form.set("image", image.file);
      form.set("imageAlt", imageAlt);
    }
    startTransition(() => dispatch(form));
  };

  const errors = state?.fieldErrors ?? {};
  const tooLong =
    title.length > LIMITS.title.max || body.length > LIMITS.body.max;
  const nearLimit =
    title.length > LIMITS.title.max * 0.8 ||
    body.length > LIMITS.body.max * 0.8;
  const choices = poll?.map((choice) => choice.trim().toLowerCase()) ?? [];
  const pollReady =
    choices.every(Boolean) && new Set(choices).size === choices.length;
  const ready =
    restored &&
    !invalidated &&
    title.trim().length >= LIMITS.title.min &&
    (body.trim().length > 0 || poll !== null) &&
    pollReady &&
    (!image || imageAlt.trim().length > 0) &&
    (topic !== "OPPORTUNITIES" ||
      (applicationUrl.trim().length > 0 &&
        parseLocalDateTime(deadline) !== null)) &&
    !tooLong;

  return (
    <form onSubmit={submit} className="flex min-h-dvh flex-col lg:min-h-0">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-background/85 px-4 py-2.5 backdrop-blur-xl lg:px-6 lg:py-4">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/campus" aria-label="Cancel">
            <X />
          </Link>
        </Button>
        <h1 className="flex-1 text-[20px] font-display">New post</h1>
        <Button
          type="submit"
          variant="primary"
          disabled={!ready || pending || preparing}
        >
          {pending && <Loader2 className="animate-spin" />}
          {pending ? "Posting" : "Post"}
        </Button>
      </header>

      {invalidated && (
        <p role="status" className="px-4 py-3 text-[14px] text-muted lg:px-6">
          Your session changed. Refresh this page before writing a new post.
        </p>
      )}
      <fieldset
        disabled={invalidated}
        className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 lg:px-6"
      >
        {topic !== "OPPORTUNITIES" && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-muted">
              Start a
            </legend>
            <div
              role="radiogroup"
              aria-label="Post type"
              className="flex gap-2"
            >
              <Choice
                checked={kind === "QUESTION"}
                onSelect={() => setKind("QUESTION")}
              >
                Question
              </Choice>
              <Choice
                checked={kind === "DISCUSSION"}
                onSelect={() => setKind("DISCUSSION")}
              >
                Conversation
              </Choice>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              Questions stay open until you mark a helpful reply.
            </p>
          </fieldset>
        )}
        <fieldset className="min-w-0">
          <legend className="mb-2 text-[13px] font-semibold text-muted">
            Topic
          </legend>
          <div
            role="radiogroup"
            aria-label="Topic"
            className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0"
          >
            {TOPICS.map((option) => (
              <Choice
                key={option.id}
                checked={topic === option.id}
                onSelect={() => setTopic(option.id)}
              >
                {option.label}
              </Choice>
            ))}
          </div>
          {topic === "MENTAL_HEALTH" && <HelplineNote className="mt-3" />}
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="mb-2 text-[13px] font-semibold text-muted">
            Who can see it
          </legend>
          <div
            role="radiogroup"
            aria-label="Audience"
            className="flex flex-wrap gap-2"
          >
            <Choice
              checked={audience === "EVERYONE"}
              onSelect={() => setAudience("EVERYONE")}
            >
              <Globe className="size-4" /> Every university
            </Choice>
            <Choice
              checked={audience === "CAMPUS"}
              onSelect={() => setAudience("CAMPUS")}
            >
              <Lock className="size-4" /> {university} campus
            </Choice>
          </div>
          <p className="mt-2 text-[12px] text-muted">
            Campus posts include explicitly assigned Canteen hosts. Moderators
            can review reported content.
          </p>
        </fieldset>

        {topic === "OPPORTUNITIES" && (
          <fieldset className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
            <legend className="text-[13px] font-semibold">
              Application details
            </legend>
            <label
              className="text-[13px] font-semibold"
              htmlFor="application-url"
            >
              Official application link
            </label>
            <input
              id="application-url"
              type="url"
              required
              value={applicationUrl}
              onChange={(e) => setApplicationUrl(e.target.value)}
              placeholder="https://…"
              maxLength={2048}
              className="rounded-xl bg-background px-3 py-2 ring-1 ring-line"
              aria-invalid={!!errors.applicationUrl || undefined}
              aria-describedby="application-error"
            />
            <FieldError id="application-error">
              {errors.applicationUrl}
            </FieldError>
            <label className="text-[13px] font-semibold" htmlFor="deadline">
              Application deadline (your local time)
            </label>
            <DateTimeField
              id="deadline"
              value={deadline}
              onChange={setDeadline}
              invalid={!!errors.deadline}
              describedBy="deadline-error"
            />
            <FieldError id="deadline-error">{errors.deadline}</FieldError>
            <p className="text-[12px] text-muted">
              Closed opportunities leave discovery automatically. Share a direct
              link to the organizer.
            </p>
          </fieldset>
        )}
        <div className="rounded-[26px] bg-surface p-1 shadow-soft ring-1 ring-line focus-within:ring-2 focus-within:ring-ink dark:focus-within:ring-you">
          <label htmlFor="title" className="sr-only">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={poll ? "Ask your question" : "What's on your mind?"}
            autoComplete="off"
            aria-invalid={!!errors.title || undefined}
            aria-describedby={errors.title ? "title-error" : undefined}
            className="w-full rounded-t-[22px] bg-transparent px-4 pt-4 pb-2 text-[20px] font-semibold tracking-tight outline-none placeholder:text-muted"
          />
          <label htmlFor="body" className="sr-only">
            Post
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={
              poll
                ? "Add context if it helps (optional)"
                : "Give people the context they need to answer well. Skip names and anything that could identify you."
            }
            rows={poll ? 2 : 6}
            aria-invalid={!!errors.body || undefined}
            aria-describedby={errors.body ? "body-error" : undefined}
            className={cn(
              "[field-sizing:content] w-full resize-none bg-transparent px-4 pb-4 text-[16px] leading-relaxed outline-none placeholder:text-muted",
              poll ? "min-h-20" : "min-h-48",
            )}
          />
          {poll && (
            <fieldset className="mx-3 mb-3 flex flex-col gap-2 rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
              <legend className="sr-only">Poll choices</legend>
              {poll.map((choice, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    aria-label={`Choice ${index + 1}`}
                    value={choice}
                    onChange={(event) =>
                      setPoll(
                        poll.map((c, i) =>
                          i === index ? event.target.value : c,
                        ),
                      )
                    }
                    placeholder={`Choice ${index + 1}`}
                    maxLength={LIMITS.pollChoice.max}
                    autoComplete="off"
                    className="h-11 min-w-0 flex-1 rounded-xl bg-surface px-3.5 text-[15px] ring-1 ring-line outline-none ring-inset placeholder:text-muted focus:ring-2 focus:ring-ink dark:focus:ring-you"
                  />
                  {poll.length > LIMITS.pollChoices.min && (
                    <button
                      type="button"
                      aria-label={`Remove choice ${index + 1}`}
                      onClick={() =>
                        setPoll(poll.filter((_, i) => i !== index))
                      }
                      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-surface-3 hover:text-ink"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between gap-2">
                {poll.length < LIMITS.pollChoices.max ? (
                  <button
                    type="button"
                    onClick={() => setPoll([...poll, ""])}
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-ink"
                  >
                    <Plus className="size-4" /> Add a choice
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => setPoll(null)}
                  className="h-9 cursor-pointer rounded-full px-3 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  Remove poll
                </button>
              </div>
            </fieldset>
          )}
          {missingImage && !image && (
            <p role="status" className="px-4 pb-3 text-[13px] text-muted">
              Your text was restored. Reattach your image if you want to include
              it.
            </p>
          )}
          {image && (
            <div className="relative mx-3 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img
                src={image.preview}
                alt={imageAlt || "Attached image preview"}
                className="max-h-80 w-full rounded-2xl object-cover"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove image"
                className="absolute top-2 right-2 grid size-8 cursor-pointer place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
              >
                <X className="size-4" />
              </button>
              <label
                htmlFor="image-alt"
                className="mt-3 block text-[13px] font-semibold"
              >
                Describe the image
              </label>
              <textarea
                id="image-alt"
                value={imageAlt}
                onChange={(event) => setImageAlt(event.target.value)}
                required
                maxLength={500}
                aria-invalid={!!errors.imageAlt || undefined}
                aria-describedby="image-alt-help image-alt-error"
                className="mt-2 min-h-20 w-full rounded-xl bg-surface p-3 text-[16px] ring-1 ring-line"
              />
              <p id="image-alt-help" className="mt-1 text-[12px] text-muted">
                Include the important information for someone who cannot see it.
                Avoid identifying details.
              </p>
              <FieldError id="image-alt-error">{errors.imageAlt}</FieldError>
            </div>
          )}
          {(imagesEnabled || !poll || nearLimit) && (
            <div className="flex items-center gap-2 border-t border-line px-3 py-2">
              {imagesEnabled && (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    disabled={preparing || pending}
                    className="peer sr-only"
                    id="image"
                    onChange={(event) => pickImage(event.target.files?.[0])}
                  />
                  <label
                    htmlFor="image"
                    className="flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-muted transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:bg-surface-3 hover:text-ink"
                  >
                    {preparing ? (
                      <Loader2 className="size-[18px] animate-spin" />
                    ) : (
                      <ImagePlus className="size-[18px]" />
                    )}
                    {image ? "Replace image" : "Add image"}
                  </label>
                </>
              )}
              {!poll && (
                <button
                  type="button"
                  onClick={() => setPoll(["", ""])}
                  className="flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  <ListChecks className="size-[18px]" /> Add poll
                </button>
              )}
              <span className="flex-1" />
              <Counter value={title.length} max={LIMITS.title.max} />
              <Counter value={body.length} max={LIMITS.body.max} />
            </div>
          )}
        </div>
        <FieldError id="title-error">{errors.title}</FieldError>
        <FieldError id="body-error">{errors.body}</FieldError>
        <FieldError>{errors.poll}</FieldError>
        <FieldError>
          {imageError ?? errors.image ?? errors.topic ?? errors.audience}
        </FieldError>
        {state?.error && (
          <p
            role="alert"
            className="rounded-2xl bg-danger-surface px-4 py-3 text-[14px] font-medium text-danger"
          >
            {state.error}
          </p>
        )}

        <p className="text-[13px] leading-relaxed text-pretty text-muted">
          You&apos;ll appear under a fresh alias that only exists in this
          thread.
          {imagesEnabled &&
            " Photos are re-encoded on your device first, so location data is removed before upload."}{" "}
          Keep it kind: no names, no screenshots of private chats, no personal
          details.
        </p>
      </fieldset>
    </form>
  );
}
