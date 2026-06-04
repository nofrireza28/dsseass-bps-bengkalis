import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  jsonb,
  unique,
  check,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { evaluationPeriods } from "./periods";
import { employees } from "./employees";
import { criteria } from "./criteria";

export const objectiveScores = pgTable(
  "objective_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => evaluationPeriods.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    criteriaId: uuid("criteria_id")
      .notNull()
      .references(() => criteria.id, { onDelete: "restrict" }),

    // Nilai final (yang dipakai di perhitungan SAW). Null = belum diisi.
    finalScore: numeric("final_score", { precision: 5, scale: 2 }),

    // Data mentah untuk transparansi & audit. Struktur tergantung calculation_type:
    // - DIRECT: null atau {}
    // - MONTHLY_AVERAGE: { "monthlyScores": { "1": 85, "2": 87, "3": 90 } }
    // - ABSENCE_THRESHOLD: { "monthlyKjk": { "1": 45, "2": 0, "3": 120 } }
    rawData: jsonb("raw_data"),

    // Audit
    inputBy: uuid("input_by").references(() => employees.id, {
      onDelete: "set null",
    }),
    inputAt: timestamp("input_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "obj_score_range",
      sql`${table.finalScore} IS NULL OR (${table.finalScore} >= 0 AND ${table.finalScore} <= 100)`,
    ),
    unique("unique_objective_score").on(
      table.periodId,
      table.employeeId,
      table.criteriaId,
    ),
    index("idx_obj_scores_period").on(table.periodId),
    index("idx_obj_scores_employee").on(table.periodId, table.employeeId),
    index("idx_obj_scores_criteria").on(table.criteriaId),
  ],
);

export const objectiveScoresRelations = relations(
  objectiveScores,
  ({ one }) => ({
    period: one(evaluationPeriods, {
      fields: [objectiveScores.periodId],
      references: [evaluationPeriods.id],
    }),
    employee: one(employees, {
      fields: [objectiveScores.employeeId],
      references: [employees.id],
    }),
    criteria: one(criteria, {
      fields: [objectiveScores.criteriaId],
      references: [criteria.id],
    }),
    inputByEmployee: one(employees, {
      fields: [objectiveScores.inputBy],
      references: [employees.id],
      relationName: "objective_input_by",
    }),
  }),
);
