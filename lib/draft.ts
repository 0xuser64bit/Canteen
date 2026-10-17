import type { Audience, PostKind, Topic } from "@/lib/generated/prisma/enums";
import { TOPICS } from "@/lib/topics";

export type Draft = {
  title: string;
  body: string;
  kind?: PostKind;
  topic?: Topic;
  audience?: Audience;
  applicationUrl?: string;
  deadline?: string;
  poll?: string[] | null;
  submissionId?: string;
  imageAlt?: string;
};

export function parseDraft(raw: string | null): Draft {
  try {
    const draft: unknown = JSON.parse(raw ?? "null");
    if (draft && typeof draft === "object") {
      const { title, body, ...context } = draft as Record<string, unknown>;
      return {
        title: typeof title === "string" ? title : "",
        body: typeof body === "string" ? body : "",
        ...(context.kind === "QUESTION" || context.kind === "DISCUSSION"
          ? { kind: context.kind }
          : {}),
        ...(TOPICS.some((topic) => topic.id === context.topic)
          ? { topic: context.topic as Topic }
          : {}),
        ...(context.audience === "EVERYONE" || context.audience === "CAMPUS"
          ? { audience: context.audience }
          : {}),
        ...Object.fromEntries(
          ["applicationUrl", "deadline", "imageAlt"].flatMap((key) =>
            typeof context[key] === "string" ? [[key, context[key]]] : [],
          ),
        ),
        ...(typeof context.submissionId === "string" &&
        /^[a-f0-9-]{36}$/i.test(context.submissionId)
          ? { submissionId: context.submissionId }
          : {}),
        ...(context.poll === null ||
        (Array.isArray(context.poll) &&
          context.poll.length <= 4 &&
          context.poll.every((choice) => typeof choice === "string"))
          ? { poll: context.poll as string[] | null }
          : {}),
      };
    }
  } catch {
    // A malformed draft must not stop someone starting a new post.
  }
  return { title: "", body: "" };
}
