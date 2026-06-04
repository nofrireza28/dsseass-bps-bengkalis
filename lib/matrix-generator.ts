// File ini SERVER-ONLY (import db)
import { db } from "@/db";
import {
  periodParticipants,
  criteria,
  evaluations,
  objectiveScores,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type MatrixGenerationResult = {
  success: boolean;
  evaluationCount?: number;
  objectiveCount?: number;
  error?: string;
};

/**
 * Generate matriks penilaian untuk periode tertentu:
 * - Insert ke `evaluations` untuk setiap pasangan (evaluator, evaluatee) multi-rater
 *   (status DRAFT, scores belum di-generate)
 * - Insert ke `objective_scores` untuk setiap evaluatee × kriteria leaf MANUAL_INPUT aktif
 *   (finalScore=null, rawData=null)
 *
 * Atomic via transaction. Idempotent: kalau matrix sudah ada, return error tanpa modifikasi.
 */
export async function generateMatrixForPeriod(
  periodId: string,
): Promise<MatrixGenerationResult> {
  try {
    // Pre-check idempotency
    const existingEval = await db
      .select({ id: evaluations.id })
      .from(evaluations)
      .where(eq(evaluations.periodId, periodId))
      .limit(1);

    if (existingEval.length > 0) {
      return {
        success: false,
        error: "Matriks penilaian sudah pernah di-generate untuk periode ini",
      };
    }

    // Fetch participants
    const participants = await db
      .select({
        employeeId: periodParticipants.employeeId,
        isEvaluator: periodParticipants.isEvaluator,
        isEvaluatee: periodParticipants.isEvaluatee,
      })
      .from(periodParticipants)
      .where(eq(periodParticipants.periodId, periodId));

    // Fetch kriteria leaf MANUAL_INPUT aktif
    const manualCriteria = await db
      .select({ id: criteria.id })
      .from(criteria)
      .where(
        and(
          eq(criteria.scoringMethod, "MANUAL_INPUT"),
          eq(criteria.isActive, true),
          eq(criteria.hasSubCriteria, false),
        ),
      );

    // Build evaluation records (multi-rater pairs)
    const evaluationRecords: Array<{
      periodId: string;
      evaluatorId: string;
      evaluateeId: string;
      status: string;
    }> = [];

    for (const evaluator of participants) {
      if (!evaluator.isEvaluator) continue;
      for (const evaluatee of participants) {
        if (!evaluatee.isEvaluatee) continue;
        if (evaluator.employeeId === evaluatee.employeeId) continue; // no self-evaluation
        evaluationRecords.push({
          periodId,
          evaluatorId: evaluator.employeeId,
          evaluateeId: evaluatee.employeeId,
          status: "DRAFT",
        });
      }
    }

    // Build objective score records
    const evaluateeIds = participants
      .filter((p) => p.isEvaluatee)
      .map((p) => p.employeeId);

    const objectiveRecords: Array<{
      periodId: string;
      employeeId: string;
      criteriaId: string;
      finalScore: null;
      rawData: null;
    }> = [];

    for (const employeeId of evaluateeIds) {
      for (const criteriaItem of manualCriteria) {
        objectiveRecords.push({
          periodId,
          employeeId,
          criteriaId: criteriaItem.id,
          finalScore: null,
          rawData: null,
        });
      }
    }

    // Insert in transaction
    await db.transaction(async (tx) => {
      if (evaluationRecords.length > 0) {
        await tx.insert(evaluations).values(evaluationRecords);
      }
      if (objectiveRecords.length > 0) {
        await tx.insert(objectiveScores).values(objectiveRecords);
      }
    });

    return {
      success: true,
      evaluationCount: evaluationRecords.length,
      objectiveCount: objectiveRecords.length,
    };
  } catch (error) {
    console.error("Failed to generate matrix:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? `Gagal generate matriks: ${error.message}`
          : "Gagal generate matriks",
    };
  }
}

/**
 * Hapus semua records matriks untuk periode (rollback).
 * Hanya boleh dipakai saat periode masih DRAFT atau untuk reset/testing.
 */
export async function clearMatrixForPeriod(periodId: string): Promise<{
  success: boolean;
  evaluationsDeleted?: number;
  objectiveScoresDeleted?: number;
  error?: string;
}> {
  try {
    const result = await db.transaction(async (tx) => {
      const evals = await tx
        .delete(evaluations)
        .where(eq(evaluations.periodId, periodId))
        .returning({ id: evaluations.id });
      const objs = await tx
        .delete(objectiveScores)
        .where(eq(objectiveScores.periodId, periodId))
        .returning({ id: objectiveScores.id });
      return { evals: evals.length, objs: objs.length };
    });

    return {
      success: true,
      evaluationsDeleted: result.evals,
      objectiveScoresDeleted: result.objs,
    };
  } catch (error) {
    console.error("Failed to clear matrix:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? `Gagal hapus matriks: ${error.message}`
          : "Gagal hapus matriks",
    };
  }
}
