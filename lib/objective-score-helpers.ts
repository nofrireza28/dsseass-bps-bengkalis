import { and, asc, eq, count, sql } from "drizzle-orm";
import { db } from "@/db";
import { criteria, objectiveScores, employees } from "@/db/schema";

import {
  getPeriodMonths,
  calculateCkpScore,
  calculateAbsenceScore,
  kjkToScore,
  calculateObjectiveScore,
} from "./objective-calc";
import type { PeriodMonth, ObjectiveRawData } from "./objective-calc";

export {
  getPeriodMonths,
  calculateCkpScore,
  calculateAbsenceScore,
  kjkToScore,
  calculateObjectiveScore,
};
export type { PeriodMonth, ObjectiveRawData };

// ============================================================
// TYPES
// ============================================================
export interface ObjectiveCriteriaInfo {
  id: string;
  code: string;
  name: string;
  weight: string;
  calculationType: string | null;
  displayOrder: number;
}

// ============================================================
// DATA — kriteria objektif (manual-input) aktif
// ============================================================

/**
 * Ambil daftar kriteria objektif (LEAF, scoring_method = MANUAL_INPUT) yang aktif.
 * Contoh: CKP (MONTHLY_AVERAGE), ABSENSI (ABSENCE_THRESHOLD).
 */
export async function getObjectiveCriteria(): Promise<ObjectiveCriteriaInfo[]> {
  return await db
    .select({
      id: criteria.id,
      code: criteria.code,
      name: criteria.name,
      weight: criteria.weight,
      calculationType: criteria.calculationType,
      displayOrder: criteria.displayOrder,
    })
    .from(criteria)
    .where(
      and(
        eq(criteria.isActive, true),
        eq(criteria.scoringMethod, "MANUAL_INPUT"),
      ),
    )
    .orderBy(asc(criteria.displayOrder));
}

// ============================================================
// DATA — progress & daftar skor objektif
// ============================================================

export interface ObjectiveCriteriaProgress {
  criteriaId: string;
  code: string;
  name: string;
  calculationType: string | null;
  weight: string;
  totalRecords: number;
  filled: number;
  empty: number;
  percentage: number;
  isComplete: boolean;
}

/**
 * Daftar kriteria objektif beserta progress pengisian per kriteria.
 * Untuk halaman list penilaian objektif (kartu CKP, ABSENSI dengan progress).
 */
export async function getObjectiveCriteriaWithProgress(
  periodId: string,
): Promise<ObjectiveCriteriaProgress[]> {
  const rows = await db
    .select({
      criteriaId: objectiveScores.criteriaId,
      code: criteria.code,
      name: criteria.name,
      calculationType: criteria.calculationType,
      weight: criteria.weight,
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
      criteria.calculationType,
      criteria.weight,
      criteria.displayOrder,
    )
    .orderBy(asc(criteria.displayOrder));

  return rows.map((r) => {
    const total = Number(r.totalRecords);
    const filled = Number(r.filled);
    const empty = total - filled;
    const percentage = total === 0 ? 0 : Math.round((filled / total) * 100);
    return {
      criteriaId: r.criteriaId,
      code: r.code,
      name: r.name,
      calculationType: r.calculationType,
      weight: r.weight,
      totalRecords: total,
      filled,
      empty,
      percentage,
      isComplete: total > 0 && percentage === 100,
    };
  });
}

export interface ObjectiveScoreRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: string | null;
  finalScore: string | null;
  rawData: ObjectiveRawData | null;
  inputAt: Date | null;
}

/**
 * Daftar skor objektif semua pegawai untuk SATU kriteria pada SATU periode.
 * Untuk halaman detail per kriteria (tabel pegawai + tombol input).
 */
export async function getObjectiveScoresByCriteria(
  periodId: string,
  criteriaId: string,
): Promise<ObjectiveScoreRow[]> {
  const rows = await db
    .select({
      id: objectiveScores.id,
      employeeId: objectiveScores.employeeId,
      employeeName: employees.fullName,
      employeePosition: employees.position,
      finalScore: objectiveScores.finalScore,
      rawData: objectiveScores.rawData,
      inputAt: objectiveScores.inputAt,
    })
    .from(objectiveScores)
    .innerJoin(employees, eq(employees.id, objectiveScores.employeeId))
    .where(
      and(
        eq(objectiveScores.periodId, periodId),
        eq(objectiveScores.criteriaId, criteriaId),
      ),
    )
    .orderBy(asc(employees.fullName));

  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    employeePosition: r.employeePosition,
    finalScore: r.finalScore,
    rawData: (r.rawData as ObjectiveRawData | null) ?? null,
    inputAt: r.inputAt,
  }));
}

/**
 * Info satu kriteria objektif by id (untuk header & logic form).
 */
export async function getObjectiveCriteriaById(
  criteriaId: string,
): Promise<ObjectiveCriteriaInfo | null> {
  const rows = await db
    .select({
      id: criteria.id,
      code: criteria.code,
      name: criteria.name,
      weight: criteria.weight,
      calculationType: criteria.calculationType,
      displayOrder: criteria.displayOrder,
    })
    .from(criteria)
    .where(eq(criteria.id, criteriaId))
    .limit(1);

  return rows[0] ?? null;
}
