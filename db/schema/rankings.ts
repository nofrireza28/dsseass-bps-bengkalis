import {
  pgTable,
  uuid,
  jsonb,
  numeric,
  integer,
  boolean,
  text,
  timestamp,
  unique,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { evaluationPeriods } from "./periods";
import { employees } from "./employees";

export const rankingCalculations = pgTable(
  "ranking_calculations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => evaluationPeriods.id, { onDelete: "cascade" }),
    calculatedBy: uuid("calculated_by")
      .notNull()
      .references(() => employees.id),
    calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
    calculationMetadata: jsonb("calculation_metadata").notNull().default({}),
    isCurrent: boolean("is_current").notNull().default(true),
    notes: text("notes"),
  },
  (table) => [
    index("idx_ranking_calc_period").on(table.periodId),
    uniqueIndex("uniq_current_calculation_per_period")
      .on(table.periodId)
      .where(sql`${table.isCurrent} = true`),
  ],
);

export const rankingResults = pgTable(
  "ranking_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calculationId: uuid("calculation_id")
      .notNull()
      .references(() => rankingCalculations.id, { onDelete: "cascade" }),
    periodId: uuid("period_id")
      .notNull()
      .references(() => evaluationPeriods.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    aggregatedScores: jsonb("aggregated_scores").notNull(),
    normalizedScores: jsonb("normalized_scores").notNull(),
    finalScore: numeric("final_score", { precision: 8, scale: 6 }).notNull(),
    rankPosition: integer("rank_position").notNull(),
    totalEvaluators: integer("total_evaluators").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("unique_ranking_per_calculation").on(
      table.calculationId,
      table.employeeId,
    ),
    index("idx_ranking_calculation").on(
      table.calculationId,
      table.rankPosition,
    ),
    index("idx_ranking_period_employee").on(table.periodId, table.employeeId),
    index("idx_ranking_employee").on(table.employeeId),
  ],
);

export const rankingCalculationsRelations = relations(
  rankingCalculations,
  ({ one, many }) => ({
    period: one(evaluationPeriods, {
      fields: [rankingCalculations.periodId],
      references: [evaluationPeriods.id],
    }),
    calculatedByEmployee: one(employees, {
      fields: [rankingCalculations.calculatedBy],
      references: [employees.id],
    }),
    results: many(rankingResults),
  }),
);

export const rankingResultsRelations = relations(rankingResults, ({ one }) => ({
  calculation: one(rankingCalculations, {
    fields: [rankingResults.calculationId],
    references: [rankingCalculations.id],
  }),
  period: one(evaluationPeriods, {
    fields: [rankingResults.periodId],
    references: [evaluationPeriods.id],
  }),
  employee: one(employees, {
    fields: [rankingResults.employeeId],
    references: [employees.id],
  }),
}));
