import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/lib/session";
import { getLaunchMetrics } from "@/server/metrics";

export const metadata: Metadata = { title: "Campus launch" };

export default async function LaunchPage() {
  const rows = await getLaunchMetrics(await requireViewer());
  if (!rows) notFound();
  return (
    <>
      <PageHeader
        title="Campus launch"
        subtitle="Team only · aggregate measures, updated as students visit"
      />
      <div className="space-y-6 px-4 py-6 lg:px-6">
        <section>
          <h2 className="text-[18px] font-semibold">
            Are students getting useful help?
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Start with students whose question received a reply they marked
            helpful. Likes and total posts provide context; useful help and
            returning students guide the launch.
          </p>
        </section>
        {rows.length ? (
          <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">Campus launch measures</caption>
              <thead className="bg-surface-2">
                <tr>
                  {[
                    "Campus",
                    "Members",
                    "Active this week",
                    "Helped this week",
                    "Week 2 return",
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-3 py-3 font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name} className="border-t border-line">
                    <th scope="row" className="px-3 py-4 font-semibold">
                      {row.name}
                    </th>
                    {[
                      row.members,
                      row.active,
                      row.helped,
                      row.returnRate === null ? null : `${row.returnRate}%`,
                    ].map((value, i) => (
                      <td key={i} className="px-3 py-4 tabular">
                        {value ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-2xl bg-surface p-5 text-[14px] text-muted ring-1 ring-line">
            Campus measures appear after at least five members join. Activity
            starts being measured with this release.
          </p>
        )}
        <dl className="space-y-4 text-[14px] leading-relaxed">
          <div>
            <dt className="font-semibold">Active this week</dt>
            <dd className="text-muted">
              Distinct students who opened the signed-in app today or in the
              previous six UTC days.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Helped this week</dt>
            <dd className="text-muted">
              Distinct question authors with a currently visible, author-marked
              helpful answer chosen in that period. Deleted or unmarked answers
              no longer count.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Week 2 return</dt>
            <dd className="text-muted">
              Students who visited on days 7–13 after joining, among signups
              14–42 days ago with a completed observation window. Signups before
              activity tracking began are excluded.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Privacy limits</dt>
            <dd className="text-muted">
              Groups below five and small return-rate groups display a dash.
              Team and suspended accounts are excluded. No emails, content,
              student lists, or individual activity are shown here. Daily marks
              expire after 90 days and are erased with the account.
            </dd>
          </div>
        </dl>
      </div>
    </>
  );
}
