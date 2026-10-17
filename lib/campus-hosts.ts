import { isTeamEmail } from "@/lib/universities";

/** Explicit opt-in assignments. Invalid configuration never grants access. */
export function campusHostDomains(email: string): string[] {
  if (!isTeamEmail(email)) return [];
  try {
    const config: unknown = JSON.parse(process.env.CAMPUS_HOSTS ?? "{}");
    if (!config || typeof config !== "object" || Array.isArray(config))
      return [];
    const entry = Object.entries(config).find(
      ([key]) => key.trim().toLowerCase() === email.trim().toLowerCase(),
    )?.[1];
    if (!Array.isArray(entry) || entry.length > 10) return [];
    return [
      ...new Set(
        entry
          .filter(
            (domain): domain is string =>
              typeof domain === "string" &&
              domain.length <= 253 &&
              /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(
                domain,
              ),
          )
          .map((domain) => domain.toLowerCase()),
      ),
    ];
  } catch {
    return [];
  }
}
