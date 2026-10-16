import { z } from "zod";
import { Audience, ReportReason, Topic } from "@/lib/generated/prisma/enums";

export const LIMITS = {
  title: { min: 4, max: 140 },
  body: { min: 1, max: 6000 },
  comment: { min: 1, max: 2000 },
  pollChoice: { max: 80 },
  pollChoices: { min: 2, max: 4 },
  imageBytes: 4 * 1024 * 1024,
  imageEdge: 2048,
} as const;

export const CONTACT_INFO_MESSAGE =
  "Take out phone numbers and email addresses. They can identify people. Sharing an opportunity? Link to its page instead.";

// Links are skipped (job and profile URLs carry long ids), and so are dates,
// which otherwise run together with a time into a phone-length number.
const LINKS = /\bhttps?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+/gi;
const DATES = /\b\d{1,4}[./-]\d{1,2}[./-]\d{1,4}\b/g;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/i;
const NUMBER_RUN = /\+?\(?\d[\d ().-]{8,}\d/g;

/** True for text carrying an email address or a phone number from any country. */
export function hasContactInfo(value: string) {
  const prose = value.replace(LINKS, " ").replace(DATES, " ");
  if (EMAIL.test(prose)) return true;
  for (const [run] of prose.matchAll(NUMBER_RUN)) {
    const digits = run.replace(/\D/g, "").length;
    // ponytail: digit count only; an ISBN or order number trips it too.
    if (digits >= 10 && digits <= 15) return true;
  }
  return false;
}

// Collapses runs of blank lines and trims, so "   " can't pass as content.
const text = (min: number, max: number, field: string) =>
  z
    .string()
    .transform((value) =>
      value
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    )
    .pipe(
      z
        .string()
        .min(min, `${field} is too short.`)
        .max(max, `${field} can be at most ${max} characters.`)
        .refine((value) => !hasContactInfo(value), CONTACT_INFO_MESSAGE),
    );

const pollChoices = z
  .array(text(1, LIMITS.pollChoice.max, "Each choice"))
  .min(LIMITS.pollChoices.min, "A poll needs at least two choices.")
  .max(LIMITS.pollChoices.max, "A poll can have up to four choices.")
  .refine(
    (choices) =>
      new Set(choices.map((choice) => choice.toLowerCase())).size ===
      choices.length,
    "Each choice needs to be different.",
  );

export const postInput = z
  .object({
    title: text(LIMITS.title.min, LIMITS.title.max, "Title"),
    body: text(0, LIMITS.body.max, "Post"),
    topic: z.enum(Topic),
    audience: z.enum(Audience),
    poll: pollChoices.optional(),
  })
  // A poll can stand on its question; anything else needs a body.
  .refine((post) => post.poll || post.body.length >= LIMITS.body.min, {
    path: ["body"],
    message: "Post is too short.",
  });

export const idInput = z.string().min(1).max(64);

export const likeInput = z.object({
  postId: idInput,
  liked: z.boolean(),
});

export const feedInput = z.object({
  scope: z.union([
    z.enum(["everyone", "campus", "mine"]),
    z
      .string()
      .max(256)
      .regex(/^university:[a-z0-9-]+$/),
  ]),
  topic: z.string().max(80).optional(),
  cursor: z.string().max(128),
});

export const pollVoteInput = z.object({
  postId: idInput,
  optionId: idInput,
});

export const commentInput = z.object({
  postId: idInput,
  body: text(LIMITS.comment.min, LIMITS.comment.max, "Reply"),
  // Client-generated so the optimistic bubble and the saved reply share one
  // identity (and one DOM node). A collision just fails the insert.
  id: z.uuid().optional(),
});

export const reportInput = z.object({
  target: z.enum(["post", "comment"]),
  id: idInput,
  reason: z.enum(ReportReason),
});

export const moderationInput = z.object({
  target: z.enum(["post", "comment"]),
  id: idInput,
  decision: z.enum(["keep", "remove", "ban"]),
});

export const DELETE_CONFIRMATION = "delete my account";

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "SPAM", label: "Spam or scam" },
  { id: "HARASSMENT", label: "Harassment or bullying" },
  { id: "HATE", label: "Hate speech" },
  { id: "PERSONAL_INFO", label: "Shares someone's personal info" },
  { id: "SELF_HARM", label: "Someone may be at risk" },
  { id: "OTHER", label: "Something else" },
];
