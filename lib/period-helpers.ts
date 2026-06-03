import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import { and, eq, inArray, ne } from "drizzle-orm";
import type { PeriodType } from "./period-constants";

// Re-export constants untuk konvenien server-side import (boleh skip kalau prefer eksplisit)
export { PERIOD_TYPES, PERIOD_STATUSES } from "./period-constants";
export type { PeriodType, PeriodStatus } from "./period-constants";

/**
 * Cek apakah ada periode aktif (status non-DRAFT, non-FINALIZED).
 */
export async function getActivePeriod(excludeId?: string) {
  const activeStatuses = ["OPEN", "CLOSED", "AWAITING_APPROVAL"];

  const conditions = [inArray(evaluationPeriods.status, activeStatuses)];
  if (excludeId) {
    conditions.push(ne(evaluationPeriods.id, excludeId));
  }

  const results = await db
    .select()
    .from(evaluationPeriods)
    .where(and(...conditions))
    .limit(1);

  return results[0] ?? null;
}

/**
 * Cek apakah periode dengan kombinasi unik sudah ada.
 */
export async function isDuplicatePeriod(
  periodType: PeriodType,
  year: number,
  periodIndex: number | null,
  excludeId?: string,
): Promise<boolean> {
  if (periodType === "CUSTOM") return false;

  const all = await db
    .select({
      id: evaluationPeriods.id,
      periodIndex: evaluationPeriods.periodIndex,
    })
    .from(evaluationPeriods)
    .where(
      and(
        eq(evaluationPeriods.periodType, periodType),
        eq(evaluationPeriods.year, year),
      ),
    );

  return all.some(
    (p) =>
      p.periodIndex === periodIndex && (excludeId ? p.id !== excludeId : true),
  );
}
