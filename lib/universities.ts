import dataset from "@/data/universities.json";

type DatasetEntry = {
  name: string;
  domains: string[];
  web_pages: string[];
  country: string;
  alpha_two_code: string;
};

export type UniversityMatch = {
  domain: string;
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  website: string | null;
};

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let byDomain: Map<string, UniversityMatch> | undefined;

// Built once per server instance. Slugs are derived deterministically from the
// dataset so two people from the same university always land on the same row.
function index() {
  if (byDomain) return byDomain;

  const entries = dataset as DatasetEntry[];
  const nameCounts = new Map<string, number>();
  for (const entry of entries) {
    const key = slugify(entry.name);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  byDomain = new Map();
  const usedSlugs = new Set<string>();
  for (const entry of entries) {
    const base = slugify(entry.name);
    const preferred =
      nameCounts.get(base)! > 1
        ? `${base}-${entry.alpha_two_code.toLowerCase()}`
        : base;
    let slug = preferred;
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${preferred}-${n}`;
    usedSlugs.add(slug);

    const university: UniversityMatch = {
      domain: entry.domains[0]!.trim().toLowerCase(),
      slug,
      name: entry.name.trim(),
      country: entry.country,
      countryCode: entry.alpha_two_code,
      website: entry.web_pages[0] ?? null,
    };
    for (const domain of entry.domains) {
      const key = domain.trim().toLowerCase();
      // A few campuses share a domain; the first listed wins.
      if (!byDomain.has(key)) byDomain.set(key, university);
    }
  }
  return byDomain;
}

/**
 * Maps an email address to its university by the longest matching domain suffix,
 * so `jane@cs.stanford.edu` and `jane@stanford.edu` both resolve to Stanford.
 */
export function findUniversityByEmail(email: string): UniversityMatch | null {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const labels = parts[1].split(".");
  const domains = index();
  // Stop before the bare TLD: "edu" or "in" alone must never match.
  for (let i = 0; i < labels.length - 1; i++) {
    const match = domains.get(labels.slice(i).join("."));
    if (match) return match;
  }
  return null;
}
