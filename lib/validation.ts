import { z } from "zod";
import { Audience, ReportReason, Topic } from "@/lib/generated/prisma/enums";

export const LIMITS = {
  title: { min: 4, max: 140 },
  body: { min: 1, max: 6000 },
  comment: { min: 1, max: 2000 },
  imageBytes: 4 * 1024 * 1024,
} as const;

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
        .max(max, `${field} can be at most ${max} characters.`),
    );

export const postInput = z.object({
  title: text(LIMITS.title.min, LIMITS.title.max, "Title"),
  body: text(LIMITS.body.min, LIMITS.body.max, "Post"),
  topic: z.enum(Topic),
  audience: z.enum(Audience),
});

export const commentInput = z.object({
  postId: z.string().min(1).max(64),
  body: text(LIMITS.comment.min, LIMITS.comment.max, "Reply"),
});

export const reportInput = z.object({
  target: z.enum(["post", "comment"]),
  id: z.string().min(1).max(64),
  reason: z.enum(ReportReason),
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
