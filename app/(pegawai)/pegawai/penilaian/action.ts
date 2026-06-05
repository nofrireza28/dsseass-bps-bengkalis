"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth"; // sesuaikan path auth kamu
import { db } from "@/db";
import {
  evaluations,
  evaluationScores,
  employees,
  evaluationPeriods,
} from "@/db/schema";
import { getTotalMultiRaterSubCriteria } from "@/lib/evaluation-helpers";

// Helper internal: ambil employee dari user session
async function getCurrentEmployee() {
  const session = await auth();
  if (!session?.user) return null;
  const employee = await db.query.employees.findFirst({
    where: eq(employees.userId, session.user.id),
  });
  return employee ?? null;
}

/**
 * Auto-save satu skor sub-kriteria (upsert).
 * Dipanggil saat evaluator berpindah field (onBlur).
 */
export async function saveScoreAction(
  evaluationId: string,
  subCriteriaId: string,
  rawScore: number,
) {
  // 1. Validasi sesi & employee
  const employee = await getCurrentEmployee();
  if (!employee) {
    return { success: false as const, error: "Tidak terautentikasi" };
  }

  // 2. Validasi range nilai (60–100)
  if (
    typeof rawScore !== "number" ||
    Number.isNaN(rawScore) ||
    rawScore < 60 ||
    rawScore > 100
  ) {
    return {
      success: false as const,
      error: "Nilai harus berada dalam rentang 60–100",
    };
  }

  // 3. Ambil evaluation + validasi kepemilikan & status
  const evaluation = await db
    .select({
      id: evaluations.id,
      evaluatorId: evaluations.evaluatorId,
      status: evaluations.status,
      periodStatus: evaluationPeriods.status,
    })
    .from(evaluations)
    .innerJoin(
      evaluationPeriods,
      eq(evaluationPeriods.id, evaluations.periodId),
    )
    .where(eq(evaluations.id, evaluationId))
    .limit(1);

  if (evaluation.length === 0) {
    return { success: false as const, error: "Penilaian tidak ditemukan" };
  }

  const ev = evaluation[0];

  // 4. Security: hanya evaluator pemilik yang boleh edit
  if (ev.evaluatorId !== employee.id) {
    return {
      success: false as const,
      error: "Anda tidak berhak mengubah penilaian ini",
    };
  }

  // 5. Periode harus OPEN
  if (ev.periodStatus !== "OPEN") {
    return {
      success: false as const,
      error: "Periode tidak dalam status OPEN, penilaian tidak dapat diubah",
    };
  }

  // 6. Status evaluation harus DRAFT (tidak bisa edit setelah SUBMITTED)
  if (ev.status !== "DRAFT") {
    return {
      success: false as const,
      error:
        "Penilaian sudah ditandai selesai. Hubungi admin untuk membukanya kembali.",
    };
  }

  // 7. Upsert score (insert atau update)
  try {
    await db
      .insert(evaluationScores)
      .values({
        evaluationId,
        subCriteriaId,
        rawScore: rawScore.toString(), // NUMERIC butuh string
      })
      .onConflictDoUpdate({
        target: [evaluationScores.evaluationId, evaluationScores.subCriteriaId],
        set: {
          rawScore: rawScore.toString(),
          updatedAt: new Date(),
        },
      });

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Gagal menyimpan nilai",
    };
  }
}

/**
 * Tandai penilaian selesai: transisi DRAFT → SUBMITTED.
 * Validasi: semua sub-kriteria harus sudah terisi.
 */
export async function submitEvaluationAction(evaluationId: string) {
  // 1. Validasi sesi & employee
  const employee = await getCurrentEmployee();
  if (!employee) {
    return { success: false as const, error: "Tidak terautentikasi" };
  }

  // 2. Ambil evaluation + validasi
  const evaluation = await db
    .select({
      id: evaluations.id,
      evaluatorId: evaluations.evaluatorId,
      periodId: evaluations.periodId,
      status: evaluations.status,
      periodStatus: evaluationPeriods.status,
    })
    .from(evaluations)
    .innerJoin(
      evaluationPeriods,
      eq(evaluationPeriods.id, evaluations.periodId),
    )
    .where(eq(evaluations.id, evaluationId))
    .limit(1);

  if (evaluation.length === 0) {
    return { success: false as const, error: "Penilaian tidak ditemukan" };
  }

  const ev = evaluation[0];

  // 3. Security: hanya evaluator pemilik
  if (ev.evaluatorId !== employee.id) {
    return {
      success: false as const,
      error: "Anda tidak berhak mengubah penilaian ini",
    };
  }

  // 4. Periode harus OPEN
  if (ev.periodStatus !== "OPEN") {
    return {
      success: false as const,
      error: "Periode tidak dalam status OPEN",
    };
  }

  // 5. Status harus DRAFT
  if (ev.status !== "DRAFT") {
    return {
      success: false as const,
      error: "Penilaian sudah ditandai selesai sebelumnya",
    };
  }

  // 6. Validasi kelengkapan: semua sub-kriteria harus terisi
  const totalRequired = await getTotalMultiRaterSubCriteria();
  const filledResult = await db
    .select({ id: evaluationScores.id })
    .from(evaluationScores)
    .where(eq(evaluationScores.evaluationId, evaluationId));

  const filledCount = filledResult.length;

  if (filledCount < totalRequired) {
    return {
      success: false as const,
      error: `Penilaian belum lengkap. Terisi ${filledCount} dari ${totalRequired} sub-kriteria.`,
    };
  }

  // 7. Update status DRAFT → SUBMITTED
  try {
    await db
      .update(evaluations)
      .set({
        status: "SUBMITTED",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(evaluations.id, evaluationId));

    revalidatePath("/dashboard/penilaian");
    revalidatePath(`/dashboard/penilaian/${evaluationId}`);

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Gagal menandai selesai",
    };
  }
}
