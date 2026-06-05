import { db } from "@/db";
import {
  evaluations,
  evaluationScores,
  subCriteria,
  criteria,
  employees,
  evaluationPeriods,
} from "@/db/schema";
import { and, eq, asc, count, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// ============================================================
// TYPES
// ============================================================

export interface SubCriteriaGrouped {
  criteriaId: string;
  criteriaCode: string;
  criteriaName: string;
  criteriaDescription: string | null;
  subCriteria: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    weight: string;
    type: string;
    displayOrder: number;
  }>;
}

export interface EvaluationListItem {
  id: string;
  evaluateeId: string;
  evaluateeName: string;
  evaluateePosition: string | null;
  status: "DRAFT" | "SUBMITTED";
  submittedAt: Date | null;
  filledScores: number;
  totalScores: number;
  progressPercentage: number;
}

export interface MyProgressStats {
  totalAssigned: number;
  submitted: number;
  draft: number;
  notStarted: number;
  inProgress: number;
  percentage: number;
}

export interface AdminEvaluationItem {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluateeId: string;
  evaluateeName: string;
  status: "DRAFT" | "SUBMITTED";
  submittedAt: Date | null;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Ambil semua sub-kriteria yang harus diisi pada penilaian multi-rater.
 * Sumber: criteria dengan scoring_method = 'MULTI_RATER' dan is_active.
 * Hasil di-group per criteria untuk kemudahan render UI.
 */
export async function getSubCriteriaForEvaluation(): Promise<
  SubCriteriaGrouped[]
> {
  const rows = await db
    .select({
      id: subCriteria.id,
      code: subCriteria.code,
      name: subCriteria.name,
      description: subCriteria.description,
      weight: subCriteria.weight,
      type: subCriteria.type,
      displayOrder: subCriteria.displayOrder,
      criteriaId: criteria.id,
      criteriaCode: criteria.code,
      criteriaName: criteria.name,
      criteriaDescription: criteria.description,
    })
    .from(subCriteria)
    .innerJoin(criteria, eq(criteria.id, subCriteria.criteriaId))
    .where(
      and(
        eq(criteria.isActive, true),
        eq(criteria.scoringMethod, "MULTI_RATER"),
      ),
    )
    .orderBy(asc(criteria.displayOrder), asc(subCriteria.displayOrder));

  // Group by criteria
  const grouped = new Map<string, SubCriteriaGrouped>();
  for (const row of rows) {
    if (!grouped.has(row.criteriaId)) {
      grouped.set(row.criteriaId, {
        criteriaId: row.criteriaId,
        criteriaCode: row.criteriaCode,
        criteriaName: row.criteriaName,
        criteriaDescription: row.criteriaDescription,
        subCriteria: [],
      });
    }
    grouped.get(row.criteriaId)!.subCriteria.push({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      weight: row.weight,
      type: row.type,
      displayOrder: row.displayOrder,
    });
  }

  return Array.from(grouped.values());
}

/**
 * Hitung total sub-kriteria multi-rater aktif.
 * Dipakai sebagai denominator untuk progress per evaluation.
 */
export async function getTotalMultiRaterSubCriteria(): Promise<number> {
  const result = await db
    .select({ total: count() })
    .from(subCriteria)
    .innerJoin(criteria, eq(criteria.id, subCriteria.criteriaId))
    .where(
      and(
        eq(criteria.isActive, true),
        eq(criteria.scoringMethod, "MULTI_RATER"),
      ),
    );

  return Number(result[0]?.total ?? 0);
}

/**
 * Ambil daftar evaluations dimana current employee adalah evaluator,
 * untuk periode tertentu (umumnya periode OPEN saat ini).
 * Disertai data evaluatee dan progress pengisian.
 */
export async function getMyEvaluationsAsEvaluator(
  evaluatorId: string,
  periodId: string,
): Promise<EvaluationListItem[]> {
  // 1. Get my evaluations + evaluatee info
  const evals = await db
    .select({
      id: evaluations.id,
      evaluateeId: evaluations.evaluateeId,
      evaluateeName: employees.fullName,
      evaluateePosition: employees.position,
      status: evaluations.status,
      submittedAt: evaluations.submittedAt,
    })
    .from(evaluations)
    .innerJoin(employees, eq(employees.id, evaluations.evaluateeId))
    .where(
      and(
        eq(evaluations.evaluatorId, evaluatorId),
        eq(evaluations.periodId, periodId),
      ),
    )
    .orderBy(asc(employees.fullName));

  if (evals.length === 0) return [];

  // 2. Total sub-kriteria yang harus diisi (sama untuk semua evaluations)
  const totalScores = await getTotalMultiRaterSubCriteria();

  // 3. Count filled scores per evaluation
  const evalIds = evals.map((e) => e.id);
  const scoreCounts = await db
    .select({
      evaluationId: evaluationScores.evaluationId,
      filledCount: count(),
    })
    .from(evaluationScores)
    .where(inArray(evaluationScores.evaluationId, evalIds))
    .groupBy(evaluationScores.evaluationId);

  const scoreCountMap = new Map<string, number>();
  for (const sc of scoreCounts) {
    scoreCountMap.set(sc.evaluationId, Number(sc.filledCount));
  }

  // 4. Combine
  return evals.map((e) => {
    const filledScores = scoreCountMap.get(e.id) ?? 0;
    const progressPercentage =
      totalScores === 0 ? 0 : Math.round((filledScores / totalScores) * 100);
    return {
      id: e.id,
      evaluateeId: e.evaluateeId,
      evaluateeName: e.evaluateeName,
      evaluateePosition: e.evaluateePosition,
      status: e.status as "DRAFT" | "SUBMITTED",
      submittedAt: e.submittedAt,
      filledScores,
      totalScores,
      progressPercentage,
    };
  });
}

/**
 * Get detail evaluation dengan scores existing.
 * Validasi: evaluation harus milik evaluator yang request (security).
 * Return null kalau evaluation tidak ditemukan atau bukan milik evaluator.
 */
export async function getEvaluationWithScores(
  evaluationId: string,
  evaluatorId: string,
) {
  // 1. Get evaluation + evaluatee + period info
  const result = await db
    .select({
      id: evaluations.id,
      periodId: evaluations.periodId,
      evaluatorId: evaluations.evaluatorId,
      evaluateeId: evaluations.evaluateeId,
      evaluateeName: employees.fullName,
      evaluateePosition: employees.position,
      status: evaluations.status,
      submittedAt: evaluations.submittedAt,
      periodName: evaluationPeriods.name,
      periodStatus: evaluationPeriods.status,
    })
    .from(evaluations)
    .innerJoin(employees, eq(employees.id, evaluations.evaluateeId))
    .innerJoin(
      evaluationPeriods,
      eq(evaluationPeriods.id, evaluations.periodId),
    )
    .where(
      and(
        eq(evaluations.id, evaluationId),
        eq(evaluations.evaluatorId, evaluatorId),
      ),
    )
    .limit(1);

  if (result.length === 0) return null;

  // 2. Get existing scores (as map for easy lookup)
  const scores = await db
    .select({
      subCriteriaId: evaluationScores.subCriteriaId,
      rawScore: evaluationScores.rawScore,
    })
    .from(evaluationScores)
    .where(eq(evaluationScores.evaluationId, evaluationId));

  const scoresBySubCriteria: Record<string, string> = {};
  for (const s of scores) {
    scoresBySubCriteria[s.subCriteriaId] = s.rawScore;
  }

  return {
    ...result[0],
    scoresBySubCriteria,
  };
}

/**
 * Stats progress evaluator pada satu periode.
 * Memecah DRAFT jadi notStarted (0 score) vs inProgress (>0 score).
 */
export async function getMyProgressStats(
  evaluatorId: string,
  periodId: string,
): Promise<MyProgressStats> {
  // Aggregate dasar
  const agg = await db
    .select({
      totalAssigned: count(),
      submitted:
        sql<number>`COUNT(*) FILTER (WHERE ${evaluations.status} = 'SUBMITTED')`.mapWith(
          Number,
        ),
    })
    .from(evaluations)
    .where(
      and(
        eq(evaluations.evaluatorId, evaluatorId),
        eq(evaluations.periodId, periodId),
      ),
    );

  const total = Number(agg[0]?.totalAssigned ?? 0);
  const submitted = Number(agg[0]?.submitted ?? 0);
  const draft = total - submitted;

  let notStarted = 0;
  let inProgress = 0;

  if (draft > 0) {
    const draftEvals = await db
      .select({
        id: evaluations.id,
        scoreCount: sql<number>`(
          SELECT COUNT(*) FROM ${evaluationScores}
          WHERE ${evaluationScores.evaluationId} = ${evaluations.id}
        )`.mapWith(Number),
      })
      .from(evaluations)
      .where(
        and(
          eq(evaluations.evaluatorId, evaluatorId),
          eq(evaluations.periodId, periodId),
          eq(evaluations.status, "DRAFT"),
        ),
      );

    for (const e of draftEvals) {
      if (Number(e.scoreCount) === 0) notStarted++;
      else inProgress++;
    }
  }

  const percentage = total === 0 ? 0 : Math.round((submitted / total) * 100);

  return {
    totalAssigned: total,
    submitted,
    draft,
    notStarted,
    inProgress,
    percentage,
  };
}

/**
 * Get current active period (status OPEN).
 * Mengembalikan null jika tidak ada periode aktif.
 */
export async function getCurrentOpenPeriod() {
  return await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.status, "OPEN"),
  });
}

/**
 * Ambil semua evaluations untuk satu periode, dengan nama evaluator & evaluatee.
 * Untuk halaman audit admin (UC-19) + fitur unsubmit.
 * Menggunakan self-join ke employees (alias) karena evaluator & evaluatee
 * sama-sama merujuk ke tabel employees.
 */
export async function getEvaluationsForAdmin(
  periodId: string,
): Promise<AdminEvaluationItem[]> {
  const evaluatorEmp = alias(employees, "evaluator_emp");
  const evaluateeEmp = alias(employees, "evaluatee_emp");

  const rows = await db
    .select({
      id: evaluations.id,
      evaluatorId: evaluations.evaluatorId,
      evaluatorName: evaluatorEmp.fullName,
      evaluateeId: evaluations.evaluateeId,
      evaluateeName: evaluateeEmp.fullName,
      status: evaluations.status,
      submittedAt: evaluations.submittedAt,
    })
    .from(evaluations)
    .innerJoin(evaluatorEmp, eq(evaluatorEmp.id, evaluations.evaluatorId))
    .innerJoin(evaluateeEmp, eq(evaluateeEmp.id, evaluations.evaluateeId))
    .where(eq(evaluations.periodId, periodId))
    .orderBy(asc(evaluatorEmp.fullName), asc(evaluateeEmp.fullName));

  return rows.map((r) => ({
    ...r,
    status: r.status as "DRAFT" | "SUBMITTED",
  }));
}
