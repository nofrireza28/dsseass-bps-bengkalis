import { and, asc, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  criteria,
  subCriteria,
  evaluations,
  evaluationPeriods,
  evaluationScores,
  objectiveScores,
  rankingCalculations,
  rankingResults,
  employees,
} from "@/db/schema";
import type { SawCriterion, SawAlternative, SawInput } from "@/lib/saw-engine";

export interface ColumnDef extends SawCriterion {
  source: "SUB" | "OBJ";
}

export interface RankingMetadata {
  method: string;
  normalization: string;
  weightSum: number;
  criteria: {
    id: string;
    code: string;
    name: string;
    weight: number;
    normalizedWeight: number;
    type: "BENEFIT" | "COST";
    maxValue: number;
    minValue: number;
  }[];
  totalAlternatives: number;
  generatedAt: string;
}

export interface RankingResultRow {
  employeeId: string;
  employeeName: string;
  employeePosition: string | null;
  finalScore: string;
  rankPosition: number;
  totalEvaluators: number;
  aggregatedScores: Record<string, number>;
  normalizedScores: Record<string, number>;
}

export interface CurrentRanking {
  calculation: {
    id: string;
    calculatedAt: Date;
    calculatedByName: string | null;
    metadata: RankingMetadata;
    notes: string | null;
  };
  results: RankingResultRow[];
}

/**
 * Ambil SEMUA kolom kriteria leaf yang aktif — dinamis.
 * Leaf multi-rater (sub_criteria) + leaf objektif (criteria tanpa sub).
 */
export async function getLeafCriteriaColumns(): Promise<ColumnDef[]> {
  const subCols = await db
    .select({
      id: subCriteria.id,
      code: subCriteria.code,
      name: subCriteria.name,
      weight: subCriteria.weight,
      type: subCriteria.type,
      displayOrder: subCriteria.displayOrder,
    })
    .from(subCriteria)
    .innerJoin(criteria, eq(criteria.id, subCriteria.criteriaId))
    .where(
      and(
        eq(criteria.isActive, true),
        eq(criteria.scoringMethod, "MULTI_RATER"),
      ),
    );

  const objCols = await db
    .select({
      id: criteria.id,
      code: criteria.code,
      name: criteria.name,
      weight: criteria.weight,
      type: criteria.type,
      displayOrder: criteria.displayOrder,
    })
    .from(criteria)
    .where(
      and(
        eq(criteria.isActive, true),
        eq(criteria.hasSubCriteria, false),
        eq(criteria.scoringMethod, "MANUAL_INPUT"),
      ),
    );

  return [
    ...subCols.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      weight: parseFloat(c.weight),
      type: c.type as "BENEFIT" | "COST",
      source: "SUB" as const,
    })),
    ...objCols.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      weight: parseFloat(c.weight),
      type: c.type as "BENEFIT" | "COST",
      source: "OBJ" as const,
    })),
  ];
}

/**
 * Susun input SAW lengkap untuk satu periode:
 * - kolom kriteria leaf (dinamis)
 * - alternatif (evaluatee) dengan nilai mentah teragregasi:
 *   • SUB → rata-rata rawScore semua penilai (SUBMITTED)
 *   • OBJ → finalScore dari objective_scores
 */
export async function gatherSawInput(
  periodId: string,
): Promise<{ input: SawInput; columns: ColumnDef[] }> {
  const columns = await getLeafCriteriaColumns();
  const subColIds = columns.filter((c) => c.source === "SUB").map((c) => c.id);
  const objColIds = columns.filter((c) => c.source === "OBJ").map((c) => c.id);

  // Jumlah penilai per evaluatee (dari evaluations SUBMITTED)
  const evaluatorCounts = await db
    .select({
      evaluateeId: evaluations.evaluateeId,
      total: sql<number>`COUNT(DISTINCT ${evaluations.evaluatorId})`.mapWith(
        Number,
      ),
    })
    .from(evaluations)
    .where(
      and(
        eq(evaluations.periodId, periodId),
        eq(evaluations.status, "SUBMITTED"),
      ),
    )
    .groupBy(evaluations.evaluateeId);

  // Agregasi subjektif: AVG(rawScore) per (evaluatee, subCriteria)
  const subAgg =
    subColIds.length === 0
      ? []
      : await db
          .select({
            evaluateeId: evaluations.evaluateeId,
            subCriteriaId: evaluationScores.subCriteriaId,
            avgScore: sql<number>`AVG(${evaluationScores.rawScore})`.mapWith(
              Number,
            ),
          })
          .from(evaluations)
          .innerJoin(
            evaluationScores,
            eq(evaluationScores.evaluationId, evaluations.id),
          )
          .where(
            and(
              eq(evaluations.periodId, periodId),
              eq(evaluations.status, "SUBMITTED"),
              inArray(evaluationScores.subCriteriaId, subColIds),
            ),
          )
          .groupBy(evaluations.evaluateeId, evaluationScores.subCriteriaId);

  // Objektif: finalScore per (employee, criteria)
  const objScores =
    objColIds.length === 0
      ? []
      : await db
          .select({
            employeeId: objectiveScores.employeeId,
            criteriaId: objectiveScores.criteriaId,
            finalScore: objectiveScores.finalScore,
          })
          .from(objectiveScores)
          .where(
            and(
              eq(objectiveScores.periodId, periodId),
              inArray(objectiveScores.criteriaId, objColIds),
            ),
          );

  // Susun scores per evaluatee
  const scoresMap = new Map<string, Record<string, number>>();
  const ensure = (id: string) => {
    let s = scoresMap.get(id);
    if (!s) {
      s = {};
      scoresMap.set(id, s);
    }
    return s;
  };
  for (const r of subAgg) ensure(r.evaluateeId)[r.subCriteriaId] = r.avgScore;
  for (const r of objScores)
    ensure(r.employeeId)[r.criteriaId] =
      r.finalScore != null ? parseFloat(r.finalScore) : 0;

  // Gabungan semua evaluatee (defensif: dari kedua sumber)
  const allIds = new Set<string>();
  for (const r of evaluatorCounts) allIds.add(r.evaluateeId);
  for (const r of objScores) allIds.add(r.employeeId);

  const counts = new Map(evaluatorCounts.map((r) => [r.evaluateeId, r.total]));

  const alternatives: SawAlternative[] = [...allIds].map((id) => ({
    employeeId: id,
    scores: scoresMap.get(id) ?? {},
    totalEvaluators: counts.get(id) ?? 0,
  }));

  const sawCriteria: SawCriterion[] = columns.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    weight: c.weight,
    type: c.type,
  }));

  return { input: { criteria: sawCriteria, alternatives }, columns };
}

/**
 * Ambil kalkulasi ranking "current" + hasilnya untuk satu periode.
 * Return null kalau belum pernah dihitung.
 */
export async function getCurrentRanking(
  periodId: string,
): Promise<CurrentRanking | null> {
  const calc = await db.query.rankingCalculations.findFirst({
    where: and(
      eq(rankingCalculations.periodId, periodId),
      eq(rankingCalculations.isCurrent, true),
    ),
  });
  if (!calc) return null;

  const calculator = await db.query.employees.findFirst({
    where: eq(employees.id, calc.calculatedBy),
  });

  const results = await db
    .select({
      employeeId: rankingResults.employeeId,
      employeeName: employees.fullName,
      employeePosition: employees.position,
      finalScore: rankingResults.finalScore,
      rankPosition: rankingResults.rankPosition,
      totalEvaluators: rankingResults.totalEvaluators,
      aggregatedScores: rankingResults.aggregatedScores,
      normalizedScores: rankingResults.normalizedScores,
    })
    .from(rankingResults)
    .innerJoin(employees, eq(employees.id, rankingResults.employeeId))
    .where(eq(rankingResults.calculationId, calc.id))
    .orderBy(asc(rankingResults.rankPosition));

  return {
    calculation: {
      id: calc.id,
      calculatedAt: calc.calculatedAt,
      calculatedByName: calculator?.fullName ?? null,
      metadata: calc.calculationMetadata as RankingMetadata,
      notes: calc.notes,
    },
    results: results.map((r) => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      employeePosition: r.employeePosition,
      finalScore: r.finalScore,
      rankPosition: r.rankPosition,
      totalEvaluators: r.totalEvaluators,
      aggregatedScores: (r.aggregatedScores as Record<string, number>) ?? {},
      normalizedScores: (r.normalizedScores as Record<string, number>) ?? {},
    })),
  };
}

export async function getPeriodsAwaitingApproval() {
  return db.query.evaluationPeriods.findMany({
    where: eq(evaluationPeriods.status, "AWAITING_APPROVAL"),
    orderBy: (p, { desc }) => [desc(p.awaitingApprovalAt)],
  });
}

export async function getFinalizedPeriods() {
  return db.query.evaluationPeriods.findMany({
    where: eq(evaluationPeriods.status, "FINALIZED"),
    orderBy: (p, { desc }) => [desc(p.finalizedAt)],
  });
}
