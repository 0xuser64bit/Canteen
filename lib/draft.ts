export type Draft = { title: string; body: string };

export function parseDraft(raw: string | null): Draft {
  try {
    const draft: unknown = JSON.parse(raw ?? "null");
    if (draft && typeof draft === "object") {
      const { title, body } = draft as Record<string, unknown>;
      return {
        title: typeof title === "string" ? title : "",
        body: typeof body === "string" ? body : "",
      };
    }
  } catch {
    // A malformed draft must not stop someone starting a new post.
  }
  return { title: "", body: "" };
}
