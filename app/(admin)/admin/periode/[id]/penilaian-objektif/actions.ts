"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth"; // sesuaikan path
import { db } from "@/db";
import {
  objectiveScores,
  criteria,
  evaluationPeriods,
  employees,
} from "@/db/schema";
import {
  calculateObjectiveScore,
  getPeriodMonths,
  type ObjectiveRawData,
} from "@/lib/objective-score-helpers";

/**
 * Simpan nilai objektif satu pegawai untuk satu kriteria.
 * Auto-calc finalScore dari rawData sesuai calculation_type kriteria.
 */
export async function saveObjectiveScoreAction(
  scoreId: string,
  rawData: ObjectiveRawData,
) {
  // 1. Auth ADMIN
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "Tidak terautentikasi" };
  }
  const userRoles = session.user.roles ?? [];
  if (!userRoles.includes("ADMIN")) {
    return {
      success: false as const,
      error: "Hanya admin yang dapat menginput nilai objektif",
    };
  }

  // 2. Get objective score + criteria + period (untuk calc & validasi)
  const result = await db
    .select({
      id: objectiveScores.id,
      periodId: objectiveScores.periodId,
      criteriaId: objectiveScores.criteriaId,
      calculationType: criteria.calculationType,
      periodStatus: evaluationPeriods.status,
      periodType: evaluationPeriods.periodType,
      year: evaluationPeriods.year,
      periodIndex: evaluationPeriods.periodIndex,
      startDate: evaluationPeriods.startDate,
      endDate: evaluationPeriods.endDate,
    })
    .from(objectiveScores)
    .innerJoin(criteria, eq(criteria.id, objectiveScores.criteriaId))
    .innerJoin(
      evaluationPeriods,
      eq(evaluationPeriods.id, objectiveScores.periodId),
    )
    .where(eq(objectiveScores.id, scoreId))
    .limit(1);

  if (result.length === 0) {
    return {
      success: false as const,
      error: "Data nilai objektif tidak ditemukan",
    };
  }

  const os = result[0];

  // 3. Periode harus OPEN
  if (os.periodStatus !== "OPEN") {
    return {
      success: false as const,
      error: `Periode berstatus ${os.periodStatus}. Nilai objektif hanya dapat diinput saat periode OPEN.`,
    };
  }

  // 4. Validasi rawData sesuai calculation_type + kelengkapan bulan
  const expectedMonths = getPeriodMonths(
    os.periodType,
    os.year,
    os.periodIndex,
    os.startDate,
    os.endDate,
  ).map((m) => m.month);

  const validation = validateRawData(
    os.calculationType,
    rawData,
    expectedMonths,
  );
  if (!validation.valid) {
    return { success: false as const, error: validation.error };
  }

  // 5. Hitung finalScore
  const finalScore = calculateObjectiveScore(os.calculationType, rawData);
  if (finalScore === null || Number.isNaN(finalScore)) {
    return {
      success: false as const,
      error: "Gagal menghitung nilai akhir dari data yang diberikan",
    };
  }
  if (finalScore < 0 || finalScore > 100) {
    return {
      success: false as const,
      error: `Nilai akhir ${finalScore} di luar rentang 0–100`,
    };
  }

  // 6. Get admin employee untuk audit
  const adminEmployee = await db.query.employees.findFirst({
    where: eq(employees.userId, session.user.id),
  });

  // 7. Update objective score
  try {
    await db
      .update(objectiveScores)
      .set({
        finalScore: finalScore.toString(),
        rawData: rawData,
        inputBy: adminEmployee?.id ?? null,
        inputAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(objectiveScores.id, scoreId));

    revalidatePath(`/admin/periode/${os.periodId}/penilaian-objektif`);
    revalidatePath(
      `/admin/periode/${os.periodId}/penilaian-objektif/${os.criteriaId}`,
    );
    revalidatePath(`/admin/periode/${os.periodId}`);
    revalidatePath(`/admin/periode/${os.periodId}/kelengkapan`);

    return { success: true as const, finalScore };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Gagal menyimpan nilai",
    };
  }
}

// ============================================================
// Helper validasi internal (non-export, tidak jadi server action)
// ============================================================
function validateRawData(
  calculationType: string | null,
  rawData: ObjectiveRawData,
  expectedMonths: number[],
): { valid: true } | { valid: false; error: string } {
  if (calculationType === "MONTHLY_AVERAGE") {
    const scores = rawData.monthlyScores;
    if (!scores) return { valid: false, error: "Data nilai bulanan tidak ada" };
    for (const m of expectedMonths) {
      const v = scores[String(m)];
      if (v == null || Number.isNaN(Number(v))) {
        return { valid: false, error: "Semua bulan harus diisi" };
      }
      if (Number(v) < 0 || Number(v) > 100) {
        return { valid: false, error: "Nilai CKP harus dalam rentang 0–100" };
      }
    }
    return { valid: true };
  }

  if (calculationType === "ABSENCE_THRESHOLD") {
    const kjk = rawData.monthlyKjk;
    if (!kjk) return { valid: false, error: "Data KJK bulanan tidak ada" };
    for (const m of expectedMonths) {
      const v = kjk[String(m)];
      if (v == null || Number.isNaN(Number(v))) {
        return {
          valid: false,
          error: "Semua bulan harus diisi (isi 0 jika tidak ada keterlambatan)",
        };
      }
      if (Number(v) < 0) {
        return { valid: false, error: "KJK tidak boleh negatif" };
      }
    }
    return { valid: true };
  }

  if (calculationType === "DIRECT") {
    const s = rawData.directScore;
    if (s == null || Number.isNaN(Number(s))) {
      return { valid: false, error: "Nilai harus diisi" };
    }
    if (Number(s) < 0 || Number(s) > 100) {
      return { valid: false, error: "Nilai harus dalam rentang 0–100" };
    }
    return { valid: true };
  }

  return { valid: false, error: "Tipe kalkulasi tidak dikenal" };
}
