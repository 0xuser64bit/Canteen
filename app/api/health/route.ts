import { connection } from "next/server";
import { db } from "@/lib/db";
import { MAINTENANCE_STALE_MS } from "@/server/operations";

// Public and content-free, for an external uptime monitor: a failing
// maintenance run pages the team, but one that never starts can't.
export async function GET() {
  await connection();
  const status = (maintenance: "ok" | "stale" | "unavailable") =>
    Response.json(
      { maintenance },
      {
        status: maintenance === "ok" ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  try {
    const maintenance = await db.maintenance.findUnique({
      where: { id: "scheduled" },
      select: { succeededAt: true },
    });
    const fresh =
      maintenance?.succeededAt != null &&
      Date.now() - maintenance.succeededAt.getTime() < MAINTENANCE_STALE_MS;
    return status(fresh ? "ok" : "stale");
  } catch {
    // An unreachable database is an outage too, not a server error page.
    return status("unavailable");
  }
}
