import { db } from "@/db";
import { evaluations, objectiveScores, criteria, employees } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";

export interface EvaluatorProgress {
  evaluatorId: string;
  evaluatorName: string;
  totalAssigned: number;
  submitted: number;
  draft: number;
  percentage: number;
  isComplete: boolean;
}

export interface ObjectiveCriteriaProgress {
  criteriaId: string;
  criteriaCode: string;
  criteriaName: string;
  totalRecords: number;
  filled: number;
  empty: number;
  percentage: number;
  isComplete: boolean;
}

export interface PeriodCompletionStats {
  // Subjektif (multi-rater)
  totalEvaluations: number;
  submittedEvaluations: number;
  draftEvaluations: number;
  subjectivePercentage: number;
  evaluatorProgress: EvaluatorProgress[];

  // Objektif (manual-input)
  totalObjectiveScores: number;
  filledObjectiveScores: number;
  emptyObjectiveScores: number;
  objectivePercentage: number;
  criteriaProgress: ObjectiveCriteriaProgress[];

  // Overall
  allComplete: boolean;
}

/**
 * Mengambil statistik kelengkapan periode (subjektif + objektif).
 * Digunakan untuk validasi pre-close dan UI dashboard kelengkapan.
 */
export async function getPeriodCompletionStats(
  periodId: string,
): Promise<PeriodCompletionStats> {
  // 1. Stats agregat subjektif
  const subjectiveAgg = await db
    .select({
      total: count(),
      submitted:
        sql<number>`COUNT(*) FILTER (WHERE ${evaluations.status} = 'SUBMITTED')`.mapWith(
          Number,
        ),
    })
    .from(evaluations)
    .where(eq(evaluations.periodId, periodId));

  const totalEvaluations = Number(subjectiveAgg[0]?.total ?? 0);
  const submittedEvaluations = Number(subjectiveAgg[0]?.submitted ?? 0);
  const draftEvaluations = totalEvaluations - submittedEvaluations;
  const subjectivePercentage =
    totalEvaluations === 0
      ? 100
      : Math.round((submittedEvaluations / totalEvaluations) * 100);

  // 2. Breakdown per evaluator
  const evaluatorRaw = await db
    .select({
      evaluatorId: evaluations.evaluatorId,
      evaluatorName: employees.fullName,
      totalAssigned: count(),
      submitted:
        sql<number>`COUNT(*) FILTER (WHERE ${evaluations.status} = 'SUBMITTED')`.mapWith(
          Number,
        ),
    })
    .from(evaluations)
    .innerJoin(employees, eq(employees.id, evaluations.evaluatorId))
    .where(eq(evaluations.periodId, periodId))
    .groupBy(evaluations.evaluatorId, employees.fullName)
    .orderBy(employees.fullName);

  const evaluatorProgress: EvaluatorProgress[] = evaluatorRaw.map((row) => {
    const total = Number(row.totalAssigned);
    const submitted = Number(row.submitted);
    const draft = total - submitted;
    const percentage =
      total === 0 ? 100 : Math.round((submitted / total) * 100);
    return {
      evaluatorId: row.evaluatorId,
      evaluatorName: row.evaluatorName,
      totalAssigned: total,
      submitted,
      draft,
      percentage,
      isComplete: percentage === 100,
    };
  });

  // 3. Stats agregat objektif
  const objectiveAgg = await db
    .select({
      total: count(),
      filled:
        sql<number>`COUNT(*) FILTER (WHERE ${objectiveScores.finalScore} IS NOT NULL)`.mapWith(
          Number,
        ),
    })
    .from(objectiveScores)
    .where(eq(objectiveScores.periodId, periodId));

  const totalObjectiveScores = Number(objectiveAgg[0]?.total ?? 0);
  const filledObjectiveScores = Number(objectiveAgg[0]?.filled ?? 0);
  const emptyObjectiveScores = totalObjectiveScores - filledObjectiveScores;
  const objectivePercentage =
    totalObjectiveScores === 0
      ? 100
      : Math.round((filledObjectiveScores / totalObjectiveScores) * 100);

  // 4. Breakdown per kriteria objektif
  const criteriaRaw = await db
    .select({
      criteriaId: objectiveScores.criteriaId,
      criteriaCode: criteria.code,
      criteriaName: criteria.name,
      displayOrder: criteria.displayOrder,
      totalRecords: count(),
      filled:
        sql<number>`COUNT(*) FILTER (WHERE ${objectiveScores.finalScore} IS NOT NULL)`.mapWith(
          Number,
        ),
    })
    .from(objectiveScores)
    .innerJoin(criteria, eq(criteria.id, objectiveScores.criteriaId))
    .where(eq(objectiveScores.periodId, periodId))
    .groupBy(
      objectiveScores.criteriaId,
      criteria.code,
      criteria.name,
      criteria.displayOrder,
    )
    .orderBy(criteria.displayOrder);

  const criteriaProgress: ObjectiveCriteriaProgress[] = criteriaRaw.map(
    (row) => {
      const total = Number(row.totalRecords);
      const filled = Number(row.filled);
      const empty = total - filled;
      const percentage = total === 0 ? 100 : Math.round((filled / total) * 100);
      return {
        criteriaId: row.criteriaId,
        criteriaCode: row.criteriaCode,
        criteriaName: row.criteriaName,
        totalRecords: total,
        filled,
        empty,
        percentage,
        isComplete: percentage === 100,
      };
    },
  );

  // 5. Overall completion
  const allComplete =
    subjectivePercentage === 100 && objectivePercentage === 100;

  return {
    totalEvaluations,
    submittedEvaluations,
    draftEvaluations,
    subjectivePercentage,
    evaluatorProgress,
    totalObjectiveScores,
    filledObjectiveScores,
    emptyObjectiveScores,
    objectivePercentage,
    criteriaProgress,
    allComplete,
  };
}

/**
 * Lightweight version: hanya angka overall, tanpa breakdown.
 * Untuk badge/indikator inline.
 */
export async function getPeriodCompletionSummary(periodId: string) {
  const stats = await getPeriodCompletionStats(periodId);
  return {
    subjectivePercentage: stats.subjectivePercentage,
    objectivePercentage: stats.objectivePercentage,
    allComplete: stats.allComplete,
    pendingEvaluations: stats.draftEvaluations,
    pendingObjectives: stats.emptyObjectiveScores,
  };
}
