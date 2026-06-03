import { db } from "@/db";
import { evaluationPeriods, subCriteria, criteria } from "@/db/schema";
import { and, eq, inArray, ne } from "drizzle-orm";

/**
 * Status periode yang MENGHALANGI modifikasi kriteria.
 * DRAFT dan FINALIZED tidak termasuk (tidak menghalangi).
 */
export const BLOCKING_PERIOD_STATUSES = [
  "OPEN",
  "CLOSED",
  "AWAITING_APPROVAL",
] as const;

export interface BlockingPeriod {
  id: string;
  name: string;
  status: string;
}

/**
 * Cek apakah ada periode dengan status yang menghalangi modifikasi kriteria.
 * Return null jika boleh modify, atau detail periode jika terkunci.
 */
export async function getBlockingPeriod(): Promise<BlockingPeriod | null> {
  const blocking = await db
    .select({
      id: evaluationPeriods.id,
      name: evaluationPeriods.name,
      status: evaluationPeriods.status,
    })
    .from(evaluationPeriods)
    .where(inArray(evaluationPeriods.status, [...BLOCKING_PERIOD_STATUSES]))
    .limit(1);

  return blocking[0] ?? null;
}

/**
 * Cek apakah ada periode FINALIZED.
 * Tidak menghalangi modifikasi, tapi UI perlu tampilkan warning.
 */
export async function hasFinalizedPeriods(): Promise<boolean> {
  const finalized = await db
    .select({ id: evaluationPeriods.id })
    .from(evaluationPeriods)
    .where(eq(evaluationPeriods.status, "FINALIZED"))
    .limit(1);

  return finalized.length > 0;
}

/**
 * Format pesan untuk user saat operasi diblokir oleh periode aktif.
 */
export function formatBlockedMessage(blocking: BlockingPeriod): string {
  const statusLabels: Record<string, string> = {
    OPEN: "sedang berlangsung",
    CLOSED: "menunggu perhitungan",
    AWAITING_APPROVAL: "menunggu pengesahan",
  };
  const statusLabel = statusLabels[blocking.status] ?? blocking.status;
  return `Tidak dapat memodifikasi kriteria karena ada periode "${blocking.name}" yang ${statusLabel}. Selesaikan periode tersebut terlebih dahulu.`;
}

/**
 * Hitung total bobot leaf saat ini.
 * Leaf = (criteria.weight WHERE has_sub_criteria=false AND is_active)
 *      + SUM(sub_criteria.weight WHERE criteria induk has_sub_criteria=true AND is_active)
 */
export async function getCurrentTotalLeafWeight(): Promise<number> {
  // Sub-criteria dari criteria GRUP aktif
  const subs = await db
    .select({ weight: subCriteria.weight })
    .from(subCriteria)
    .innerJoin(criteria, eq(subCriteria.criteriaId, criteria.id))
    .where(and(eq(criteria.isActive, true), eq(criteria.hasSubCriteria, true)));

  // Criteria LEAF aktif
  const leafs = await db
    .select({ weight: criteria.weight })
    .from(criteria)
    .where(
      and(eq(criteria.isActive, true), eq(criteria.hasSubCriteria, false)),
    );

  const sumSubs = subs.reduce((s, x) => s + parseFloat(x.weight), 0);
  const sumLeafs = leafs.reduce((s, x) => s + parseFloat(x.weight), 0);
  return sumSubs + sumLeafs;
}

/**
 * Hitung total bobot leaf, EXCLUDE kontribusi dari criteria tertentu.
 * Berguna saat update: total = otherContribution + thisCriteriaNewContribution
 */
export async function getOtherLeafWeight(
  excludeCriteriaId: string,
): Promise<number> {
  // Sub-criteria dari criteria GRUP aktif, exclude induk = excludeCriteriaId
  const otherSubs = await db
    .select({ weight: subCriteria.weight })
    .from(subCriteria)
    .innerJoin(criteria, eq(subCriteria.criteriaId, criteria.id))
    .where(
      and(
        eq(criteria.isActive, true),
        eq(criteria.hasSubCriteria, true),
        ne(criteria.id, excludeCriteriaId),
      ),
    );

  // Criteria LEAF aktif, exclude id = excludeCriteriaId
  const otherLeafs = await db
    .select({ weight: criteria.weight })
    .from(criteria)
    .where(
      and(
        eq(criteria.isActive, true),
        eq(criteria.hasSubCriteria, false),
        ne(criteria.id, excludeCriteriaId),
      ),
    );

  const sumSubs = otherSubs.reduce((s, x) => s + parseFloat(x.weight), 0);
  const sumLeafs = otherLeafs.reduce((s, x) => s + parseFloat(x.weight), 0);
  return sumSubs + sumLeafs;
}

/**
 * Label untuk display di UI.
 */
export const SCORING_METHOD_LABELS: Record<string, string> = {
  MULTI_RATER: "Penilaian Multi-Rater",
  MANUAL_INPUT: "Input Panitia",
};

export const CALCULATION_TYPE_LABELS: Record<string, string> = {
  DIRECT: "Input Nilai Langsung",
  MONTHLY_AVERAGE: "Rata-rata Bulanan",
  ABSENCE_THRESHOLD: "Konversi KJK",
};
