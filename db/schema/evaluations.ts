import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  unique,
  check,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { evaluationPeriods } from "./periods";
import { employees } from "./employees";
import { subCriteria } from "./criteria";

export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => evaluationPeriods.id, { onDelete: "cascade" }),
    evaluatorId: uuid("evaluator_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    evaluateeId: uuid("evaluatee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull().default("DRAFT"),
    submittedAt: timestamp("submitted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check("eval_status_check", sql`${table.status} IN ('DRAFT', 'SUBMITTED')`),
    check(
      "no_self_evaluation",
      sql`${table.evaluatorId} != ${table.evaluateeId}`,
    ),
    unique("unique_evaluation").on(
      table.periodId,
      table.evaluatorId,
      table.evaluateeId,
    ),
    index("idx_evaluations_period").on(table.periodId),
    index("idx_evaluations_evaluator").on(table.periodId, table.evaluatorId),
    index("idx_evaluations_evaluatee").on(table.periodId, table.evaluateeId),
    index("idx_evaluations_status").on(table.periodId, table.status),
  ],
);

export const evaluationScores = pgTable(
  "evaluation_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id, { onDelete: "cascade" }),
    subCriteriaId: uuid("sub_criteria_id")
      .notNull()
      .references(() => subCriteria.id, { onDelete: "restrict" }),
    rawScore: numeric("raw_score", { precision: 5, scale: 2 }).notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "score_range",
      sql`${table.rawScore} >= 60 AND ${table.rawScore} <= 100`,
    ),
    unique("unique_score_per_subcriteria").on(
      table.evaluationId,
      table.subCriteriaId,
    ),
    index("idx_scores_evaluation").on(table.evaluationId),
    index("idx_scores_subcriteria").on(table.subCriteriaId),
  ],
);

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
  period: one(evaluationPeriods, {
    fields: [evaluations.periodId],
    references: [evaluationPeriods.id],
  }),
  evaluator: one(employees, {
    fields: [evaluations.evaluatorId],
    references: [employees.id],
    relationName: "evaluator",
  }),
  evaluatee: one(employees, {
    fields: [evaluations.evaluateeId],
    references: [employees.id],
    relationName: "evaluatee",
  }),
  scores: many(evaluationScores),
}));

export const evaluationScoresRelations = relations(
  evaluationScores,
  ({ one }) => ({
    evaluation: one(evaluations, {
      fields: [evaluationScores.evaluationId],
      references: [evaluations.id],
    }),
    subCriteria: one(subCriteria, {
      fields: [evaluationScores.subCriteriaId],
      references: [subCriteria.id],
    }),
  }),
);
