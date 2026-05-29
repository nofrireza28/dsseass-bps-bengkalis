import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

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
