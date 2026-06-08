import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { evaluationPeriods, employees } from "@/db/schema";

export async function getPimpinanDashboardStats() {
  const rows = await db
    .select({ status: evaluationPeriods.status, total: count() })
    .from(evaluationPeriods)
    .groupBy(evaluationPeriods.status);

  const map = new Map(rows.map((r) => [r.status, Number(r.total)]));
  return {
    awaitingApproval: map.get("AWAITING_APPROVAL") ?? 0,
    finalized: map.get("FINALIZED") ?? 0,
    open: map.get("OPEN") ?? 0,
  };
}

export async function getAdminDashboardStats() {
  const periodRows = await db
    .select({ status: evaluationPeriods.status, total: count() })
    .from(evaluationPeriods)
    .groupBy(evaluationPeriods.status);
  const pMap = new Map(periodRows.map((r) => [r.status, Number(r.total)]));

  const [emp] = await db
    .select({ total: count() })
    .from(employees)
    .where(eq(employees.status, "ACTIVE"));

  const recentPeriods = await db.query.evaluationPeriods.findMany({
    orderBy: (p, { desc }) => [desc(p.updatedAt)],
    limit: 5,
  });

  return {
    totalPegawai: Number(emp?.total ?? 0),
    periodeAktif: pMap.get("OPEN") ?? 0,
    perluDihitung: pMap.get("CLOSED") ?? 0,
    menungguPengesahan: pMap.get("AWAITING_APPROVAL") ?? 0,
    recentPeriods,
  };
}
