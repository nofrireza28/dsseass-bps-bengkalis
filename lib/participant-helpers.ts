import { db } from "@/db";
import { periodParticipants, employees } from "@/db/schema";
import { and, eq, notInArray, sql } from "drizzle-orm";

/**
 * Get semua partisipan periode beserta data pegawai
 */
export async function getParticipants(periodId: string) {
  return await db
    .select({
      periodId: periodParticipants.periodId,
      employeeId: periodParticipants.employeeId,
      isEvaluator: periodParticipants.isEvaluator,
      isEvaluatee: periodParticipants.isEvaluatee,
      notes: periodParticipants.notes,
      employee: {
        id: employees.id,
        fullName: employees.fullName,
        nip: employees.nip,
        position: employees.position,
        status: employees.status,
      },
    })
    .from(periodParticipants)
    .innerJoin(employees, eq(periodParticipants.employeeId, employees.id))
    .where(eq(periodParticipants.periodId, periodId))
    .orderBy(employees.fullName);
}

/**
 * Hitung total partisipan periode
 */
export async function getParticipantCount(periodId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(periodParticipants)
    .where(eq(periodParticipants.periodId, periodId));
  return result[0]?.count ?? 0;
}

/**
 * Get pegawai aktif yang belum menjadi partisipan periode tertentu
 */
export async function getAvailableEmployees(periodId: string) {
  const participantIds = await db
    .select({ employeeId: periodParticipants.employeeId })
    .from(periodParticipants)
    .where(eq(periodParticipants.periodId, periodId));

  const excludeIds = participantIds.map((p) => p.employeeId);

  const baseQuery = db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      nip: employees.nip,
      position: employees.position,
    })
    .from(employees);

  const whereClause =
    excludeIds.length === 0
      ? eq(employees.status, "ACTIVE")
      : and(
          eq(employees.status, "ACTIVE"),
          notInArray(employees.id, excludeIds),
        );

  return await baseQuery.where(whereClause).orderBy(employees.fullName);
}

/**
 * Hitung pegawai aktif yang TIDAK jadi partisipan (untuk warning sebelum OPEN)
 */
export async function getAvailableEmployeeCount(
  periodId: string,
): Promise<number> {
  const available = await getAvailableEmployees(periodId);
  return available.length;
}
