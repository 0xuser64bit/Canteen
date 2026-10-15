import type { Topic } from "@/lib/generated/prisma/enums";

export const TOPICS = [
  { id: "GENERAL", slug: "general", label: "General" },
  { id: "ACADEMICS", slug: "academics", label: "Academics" },
  { id: "CAMPUS_LIFE", slug: "campus-life", label: "Campus life" },
  { id: "CAREERS", slug: "careers", label: "Careers" },
  { id: "MENTAL_HEALTH", slug: "mental-health", label: "Mental health" },
  { id: "OPPORTUNITIES", slug: "opportunities", label: "Opportunities" },
] as const satisfies readonly { id: Topic; slug: string; label: string }[];

export function topicBySlug(slug: string | undefined) {
  return TOPICS.find((topic) => topic.slug === slug);
}

export function topicLabel(id: Topic) {
  return TOPICS.find((topic) => topic.id === id)!.label;
}
