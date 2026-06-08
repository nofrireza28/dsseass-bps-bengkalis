"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth"; // sesuaikan path
import { db } from "@/db";
import {
  evaluationPeriods,
  employees,
  rankingCalculations,
  rankingResults,
} from "@/db/schema";
import { calculateSaw } from "@/lib/saw-engine";
import { gatherSawInput } from "@/lib/ranking-helpers";

export async function calculateRankingAction(periodId: string, notes?: string) {
  // 1. Auth ADMIN
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "Tidak terautentikasi" };
  }
  if (!(session.user.roles ?? []).includes("ADMIN")) {
    return {
      success: false as const,
      error: "Hanya admin yang dapat menghitung ranking",
    };
  }

  // 2. Periode harus CLOSED
  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });
  if (!period) {
    return { success: false as const, error: "Periode tidak ditemukan" };
  }
  if (period.status !== "CLOSED") {
    return {
      success: false as const,
      error: `Ranking hanya dapat dihitung saat periode CLOSED. Status saat ini: ${period.status}.`,
    };
  }

  // 3. Kumpulkan data + jalankan engine
  let input, output;
  try {
    ({ input } = await gatherSawInput(periodId));
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Gagal mengumpulkan data",
    };
  }
  if (input.criteria.length === 0) {
    return { success: false as const, error: "Tidak ada kriteria aktif" };
  }
  if (input.alternatives.length === 0) {
    return {
      success: false as const,
      error: "Tidak ada pegawai untuk dihitung",
    };
  }

  try {
    output = calculateSaw(input);
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Gagal menghitung SAW",
    };
  }

  // 3b. Guard: total bobot harus ~1.0 (deteksi salah konfigurasi bobot)
  const weightOff = Math.abs(output.weightSum - 1) > 0.01;

  // 4. Admin employee (untuk audit calculated_by)
  const adminEmployee = await db.query.employees.findFirst({
    where: eq(employees.userId, session.user.id),
  });
  if (!adminEmployee) {
    return {
      success: false as const,
      error: "Data pegawai untuk akun admin tidak ditemukan",
    };
  }

  const metadata = {
    method: "SAW",
    normalization: "max_column",
    weightSum: output.weightSum,
    criteria: output.criteriaMeta,
    totalAlternatives: output.results.length,
    generatedAt: new Date().toISOString(),
  };

  // 5. Simpan snapshot dalam TRANSAKSI
  try {
    await db.transaction(async (tx) => {
      // a. nonaktifkan kalkulasi current lama
      await tx
        .update(rankingCalculations)
        .set({ isCurrent: false })
        .where(
          and(
            eq(rankingCalculations.periodId, periodId),
            eq(rankingCalculations.isCurrent, true),
          ),
        );

      // b. insert kalkulasi baru
      const [calc] = await tx
        .insert(rankingCalculations)
        .values({
          periodId,
          calculatedBy: adminEmployee.id,
          calculationMetadata: metadata,
          isCurrent: true,
          notes: notes ?? null,
        })
        .returning({ id: rankingCalculations.id });

      // c. insert semua hasil
      await tx.insert(rankingResults).values(
        output.results.map((r) => ({
          calculationId: calc.id,
          periodId,
          employeeId: r.employeeId,
          aggregatedScores: r.aggregatedScores,
          normalizedScores: r.normalizedScores,
          finalScore: r.finalScore.toString(),
          rankPosition: r.rankPosition,
          totalEvaluators: r.totalEvaluators,
        })),
      );
    });
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Gagal menyimpan hasil ranking",
    };
  }

  revalidatePath(`/admin/periode/${periodId}`);
  revalidatePath(`/admin/periode/${periodId}/ranking`);

  return {
    success: true as const,
    totalRanked: output.results.length,
    weightSum: output.weightSum,
    warning: weightOff
      ? `Total bobot kriteria = ${output.weightSum.toFixed(4)} (idealnya 1.0). Periksa konfigurasi bobot — hasil tetap dihitung secara proporsional.`
      : null,
  };
}

/**
 * Ajukan periode untuk pengesahan: CLOSED → AWAITING_APPROVAL.
 * Prasyarat: status CLOSED & ranking sudah dihitung (ada kalkulasi current).
 */
export async function submitForApprovalAction(periodId: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "Tidak terautentikasi" };
  }
  if (!(session.user.roles ?? []).includes("ADMIN")) {
    return {
      success: false as const,
      error: "Hanya admin yang dapat mengajukan pengesahan",
    };
  }

  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });
  if (!period) {
    return { success: false as const, error: "Periode tidak ditemukan" };
  }
  if (period.status !== "CLOSED") {
    return {
      success: false as const,
      error: `Hanya periode CLOSED yang dapat diajukan. Status saat ini: ${period.status}.`,
    };
  }

  // Prasyarat: ranking sudah dihitung
  const calc = await db.query.rankingCalculations.findFirst({
    where: and(
      eq(rankingCalculations.periodId, periodId),
      eq(rankingCalculations.isCurrent, true),
    ),
  });
  if (!calc) {
    return {
      success: false as const,
      error: "Hitung ranking terlebih dahulu sebelum mengajukan pengesahan.",
    };
  }

  try {
    await db
      .update(evaluationPeriods)
      .set({
        status: "AWAITING_APPROVAL",
        awaitingApprovalAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(evaluationPeriods.id, periodId));
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Gagal mengajukan pengesahan",
    };
  }

  revalidatePath(`/admin/periode/${periodId}`);
  revalidatePath(`/admin/periode/${periodId}/ranking`);
  return { success: true as const };
}
