import {
  pgTable,
  uuid,
  varchar,
  date,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  check,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { employees } from "./employees";

export const evaluationPeriods = pgTable(
  "evaluation_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    periodType: varchar("period_type", { length: 20 })
      .notNull()
      .default("QUARTERLY"),
    year: integer("year").notNull(),
    periodIndex: integer("period_index"),
    description: text("description"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: varchar("status", { length: 30 }).notNull().default("DRAFT"),
    createdBy: uuid("created_by").references(() => employees.id),
    openedAt: timestamp("opened_at"),
    openedBy: uuid("opened_by").references(() => employees.id),
    closedAt: timestamp("closed_at"),
    closedBy: uuid("closed_by").references(() => employees.id),
    awaitingApprovalAt: timestamp("awaiting_approval_at"),
    finalizedAt: timestamp("finalized_at"),
    finalizedBy: uuid("finalized_by").references(() => employees.id),
    approvalNotes: text("approval_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "period_type_check",
      sql`${table.periodType} IN ('MONTHLY', 'QUARTERLY', 'SEMESTER', 'ANNUAL', 'CUSTOM')`,
    ),
    check(
      "period_status_check",
      sql`${table.status} IN ('DRAFT', 'OPEN', 'CLOSED', 'AWAITING_APPROVAL', 'FINALIZED')`,
    ),
    check("valid_period_dates", sql`${table.endDate} > ${table.startDate}`),
    check(
      "period_year_check",
      sql`${table.year} >= 2020 AND ${table.year} <= 2100`,
    ),
    index("idx_periods_status").on(table.status),
    index("idx_periods_dates").on(table.startDate, table.endDate),
    index("idx_periods_year_type").on(table.year, table.periodType),
  ],
);

export const periodParticipants = pgTable(
  "period_participants",
  {
    periodId: uuid("period_id")
      .notNull()
      .references(() => evaluationPeriods.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    isEvaluator: boolean("is_evaluator").notNull().default(true),
    isEvaluatee: boolean("is_evaluatee").notNull().default(true),
    notes: text("notes"),
  },
  (table) => [
    primaryKey({ columns: [table.periodId, table.employeeId] }),
    index("idx_participants_period").on(table.periodId),
  ],
);

export const evaluationPeriodsRelations = relations(
  evaluationPeriods,
  ({ many, one }) => ({
    participants: many(periodParticipants),
    createdByEmployee: one(employees, {
      fields: [evaluationPeriods.createdBy],
      references: [employees.id],
      relationName: "created_by_employee",
    }),
    openedByEmployee: one(employees, {
      fields: [evaluationPeriods.openedBy],
      references: [employees.id],
      relationName: "opened_by_employee",
    }),
    closedByEmployee: one(employees, {
      fields: [evaluationPeriods.closedBy],
      references: [employees.id],
      relationName: "closed_by_employee",
    }),
    finalizedByEmployee: one(employees, {
      fields: [evaluationPeriods.finalizedBy],
      references: [employees.id],
      relationName: "finalized_by_employee",
    }),
  }),
);

export const periodParticipantsRelations = relations(
  periodParticipants,
  ({ one }) => ({
    period: one(evaluationPeriods, {
      fields: [periodParticipants.periodId],
      references: [evaluationPeriods.id],
    }),
    employee: one(employees, {
      fields: [periodParticipants.employeeId],
      references: [employees.id],
    }),
  }),
);
