"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { findUniversityByEmail } from "@/lib/universities";
import { universityRequestInput } from "@/lib/university-request";
import { idInput } from "@/lib/validation";
import { isModerator } from "@/server/queries";

export type UniversityRequestState = { ok?: boolean; error?: string } | null;

export async function requestUniversity(
  _: UniversityRequestState,
  form: FormData,
): Promise<UniversityRequestState> {
  if (!(form instanceof FormData))
    return { error: "That request could not be read. Try again." };
  const parsed = universityRequestInput.safeParse({
    domain: form.get("domain"),
    website: form.get("website"),
  });
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Check the domain and university homepage.",
    };
  if (findUniversityByEmail(`domain-check@${parsed.data.domain}`))
    return {
      error:
        "That domain is already recognized. Return to sign-in and try your university address.",
    };
  try {
    return await db.$transaction(async (tx) => {
      const now = BigInt(Date.now());
      const cutoff = now - BigInt(24 * 60 * 60_000);
      // A bounded public queue budget; no email, IP address or account record.
      const [budget] = await tx.$queryRaw<{ count: number }[]>`
        INSERT INTO "RateLimit" ("id", "key", "count", "lastRequest") VALUES (${crypto.randomUUID()}, 'university-domain-requests', 1, ${now})
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "RateLimit"."lastRequest" < ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
          "lastRequest" = CASE WHEN "RateLimit"."lastRequest" < ${cutoff} THEN ${now} ELSE "RateLimit"."lastRequest" END
        RETURNING "count"
      `;
      if (!budget || budget.count > 100)
        return {
          error:
            "The review queue has received many requests today. Please try again tomorrow.",
        };
      await tx.universityRequest.upsert({
        where: { domain: parsed.data.domain },
        create: parsed.data,
        update: {},
      });
      return { ok: true };
    });
  } catch {
    return { error: "We couldn't save the request. Please try again later." };
  }
}

export async function reviewUniversityRequest(id: string, resolved: boolean) {
  const viewer = await getViewer();
  if (
    !viewer ||
    !isModerator(viewer) ||
    !idInput.safeParse(id).success ||
    typeof resolved !== "boolean"
  )
    return { ok: false, error: "This request is not available." };
  const request = await db.universityRequest.findUnique({ where: { id } });
  if (!request) return { ok: false, error: "This request is not available." };
  if (resolved && !findUniversityByEmail(`domain-check@${request.domain}`))
    return {
      ok: false,
      error:
        "Verify and add the domain to the university dataset before marking it resolved.",
    };
  await db.universityRequest.update({
    where: { id },
    data: { reviewedAt: new Date(), accepted: resolved },
  });
  revalidatePath("/launch");
  return { ok: true };
}
