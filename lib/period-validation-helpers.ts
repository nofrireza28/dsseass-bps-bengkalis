// File ini SERVER-ONLY (import db)
import { db } from "@/db";
import { evaluationPeriods, periodParticipants, criteria } from "@/db/schema";
import { and, eq, ne, inArray, sql } from "drizzle-orm";
import { getCurrentTotalLeafWeight } from "./criteria-helpers";
import {
  getPeriodCompletionStats,
  type PeriodCompletionStats,
} from "./period-completion-helpers";

const FLOAT_TOLERANCE = 0.0001;

export type ValidationCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type PreOpenValidation = {
  allPassed: boolean;
  checks: ValidationCheck[];
  matrixEstimate: {
    multiRaterEvaluations: number;
    objectiveScores: number;
    total: number;
  };
};

/**
 * Validasi sebelum periode boleh dibuka (DRAFT → OPEN).
 * Mengembalikan checklist + estimasi jumlah records yang akan di-generate.
 */
export async function validatePreOpen(
  periodId: string,
): Promise<PreOpenValidation> {
  const checks: ValidationCheck[] = [];

  // 1. Periode harus DRAFT
  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
    columns: { id: true, status: true, name: true },
  });

  if (!period) {
    checks.push({
      id: "period_exists",
      label: "Periode ditemukan",
      passed: false,
      detail: "Periode tidak ditemukan",
    });
    return buildResult(checks, {
      multiRaterEvaluations: 0,
      objectiveScores: 0,
    });
  }

  checks.push({
    id: "period_draft",
    label: "Periode berstatus DRAFT",
    passed: period.status === "DRAFT",
    detail:
      period.status === "DRAFT"
        ? "Periode dapat dibuka"
        : `Periode berstatus ${period.status}, tidak dapat dibuka`,
  });

  // 2. Tidak ada periode lain yang aktif (OPEN/CLOSED/AWAITING_APPROVAL)
  const activeStatuses = ["OPEN", "CLOSED", "AWAITING_APPROVAL"];
  const conflictingPeriods = await db
    .select({
      id: evaluationPeriods.id,
      name: evaluationPeriods.name,
      status: evaluationPeriods.status,
    })
    .from(evaluationPeriods)
    .where(
      and(
        inArray(evaluationPeriods.status, activeStatuses),
        ne(evaluationPeriods.id, periodId),
      ),
    )
    .limit(1);

  checks.push({
    id: "no_conflict",
    label: "Tidak ada periode lain yang aktif",
    passed: conflictingPeriods.length === 0,
    detail:
      conflictingPeriods.length === 0
        ? "Tidak ada konflik"
        : `Periode "${conflictingPeriods[0].name}" sedang ${conflictingPeriods[0].status}. Tutup atau sahkan dulu sebelum membuka periode lain.`,
  });

  // 3. Total bobot leaf kriteria aktif = 100%
  const totalWeight = await getCurrentTotalLeafWeight();
  const weightValid = Math.abs(totalWeight - 1.0) < FLOAT_TOLERANCE;
  checks.push({
    id: "weight_complete",
    label: "Total bobot kriteria aktif = 100%",
    passed: weightValid,
    detail: weightValid
      ? "Bobot lengkap (100%)"
      : `Total bobot saat ini ${(totalWeight * 100).toFixed(2)}% — sesuaikan di menu Kriteria`,
  });

  // 4. Minimal 2 partisipan
  const participants = await db
    .select({
      employeeId: periodParticipants.employeeId,
      isEvaluator: periodParticipants.isEvaluator,
      isEvaluatee: periodParticipants.isEvaluatee,
    })
    .from(periodParticipants)
    .where(eq(periodParticipants.periodId, periodId));

  checks.push({
    id: "min_participants",
    label: "Minimal 2 partisipan",
    passed: participants.length >= 2,
    detail:
      participants.length >= 2
        ? `${participants.length} partisipan`
        : `Hanya ${participants.length} partisipan — minimal 2 untuk peer evaluation`,
  });

  // 5. Minimal 1 evaluator
  const evaluatorCount = participants.filter((p) => p.isEvaluator).length;
  checks.push({
    id: "min_evaluator",
    label: "Minimal 1 partisipan sebagai evaluator",
    passed: evaluatorCount >= 1,
    detail:
      evaluatorCount >= 1
        ? `${evaluatorCount} evaluator`
        : "Belum ada partisipan dengan peran evaluator",
  });

  // 6. Minimal 1 evaluatee
  const evaluateeCount = participants.filter((p) => p.isEvaluatee).length;
  checks.push({
    id: "min_evaluatee",
    label: "Minimal 1 partisipan sebagai evaluatee",
    passed: evaluateeCount >= 1,
    detail:
      evaluateeCount >= 1
        ? `${evaluateeCount} evaluatee`
        : "Belum ada partisipan dengan peran evaluatee",
  });

  // 7. Estimasi matrix records
  //    Multi-rater: tiap (evaluator, evaluatee) pair berbeda dengan evaluator≠evaluatee
  let multiRaterEvaluations = 0;
  for (const evaluator of participants) {
    if (!evaluator.isEvaluator) continue;
    for (const evaluatee of participants) {
      if (!evaluatee.isEvaluatee) continue;
      if (evaluator.employeeId === evaluatee.employeeId) continue;
      multiRaterEvaluations++;
    }
  }

  //    Objective: tiap evaluatee × tiap kriteria leaf MANUAL_INPUT aktif
  const manualCriteriaCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(criteria)
    .where(
      and(
        eq(criteria.scoringMethod, "MANUAL_INPUT"),
        eq(criteria.isActive, true),
        eq(criteria.hasSubCriteria, false),
      ),
    );

  const objectiveScoreCount =
    evaluateeCount * (manualCriteriaCount[0]?.count ?? 0);

  return buildResult(checks, {
    multiRaterEvaluations,
    objectiveScores: objectiveScoreCount,
  });
}

function buildResult(
  checks: ValidationCheck[],
  matrixEstimate: { multiRaterEvaluations: number; objectiveScores: number },
): PreOpenValidation {
  return {
    allPassed: checks.every((c) => c.passed),
    checks,
    matrixEstimate: {
      multiRaterEvaluations: matrixEstimate.multiRaterEvaluations,
      objectiveScores: matrixEstimate.objectiveScores,
      total:
        matrixEstimate.multiRaterEvaluations + matrixEstimate.objectiveScores,
    },
  };
}

export interface PreCloseCheck {
  label: string;
  passed: boolean;
  detail?: string;
}

export interface PreCloseValidation {
  allPassed: boolean;
  checks: PreCloseCheck[];
  stats: PeriodCompletionStats;
}

/**
 * Validasi pre-close: 3 checklist sebelum periode dapat ditutup.
 * Strict 100% — tidak ada bypass.
 */
export async function validatePreClose(
  periodId: string,
): Promise<PreCloseValidation> {
  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });

  if (!period) {
    throw new Error("Periode tidak ditemukan");
  }

  const stats = await getPeriodCompletionStats(periodId);

  const checks: PreCloseCheck[] = [
    {
      label: "Status periode adalah OPEN",
      passed: period.status === "OPEN",
      detail:
        period.status !== "OPEN"
          ? `Status saat ini: ${period.status}`
          : undefined,
    },
    {
      label: "Semua evaluasi subjektif sudah SUBMITTED (100%)",
      passed: stats.subjectivePercentage === 100,
      detail:
        stats.subjectivePercentage < 100
          ? `${stats.submittedEvaluations} dari ${stats.totalEvaluations} (${stats.subjectivePercentage}%) — masih ada ${stats.draftEvaluations} evaluasi DRAFT`
          : `${stats.submittedEvaluations} dari ${stats.totalEvaluations} (100%)`,
    },
    {
      label: "Semua penilaian objektif sudah diisi (100%)",
      passed: stats.objectivePercentage === 100,
      detail:
        stats.objectivePercentage < 100
          ? `${stats.filledObjectiveScores} dari ${stats.totalObjectiveScores} (${stats.objectivePercentage}%) — masih ada ${stats.emptyObjectiveScores} record kosong`
          : `${stats.filledObjectiveScores} dari ${stats.totalObjectiveScores} (100%)`,
    },
  ];

  const allPassed = checks.every((c) => c.passed);

  return { allPassed, checks, stats };
}
