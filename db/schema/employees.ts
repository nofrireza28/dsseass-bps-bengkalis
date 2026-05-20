import {
  pgTable,
  uuid,
  varchar,
  date,
  timestamp,
  check,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./auth";

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .unique()
      .references(() => users.id, { onDelete: "set null" }),
    nip: varchar("nip", { length: 50 }).unique().notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    position: varchar("position", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("ACTIVE"),
    joinedAt: date("joined_at"),
    exitedAt: date("exited_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "status_check",
      sql`${table.status} IN ('ACTIVE', 'INACTIVE', 'ON_LEAVE')`,
    ),
    check(
      "valid_employment_dates",
      sql`${table.exitedAt} IS NULL OR ${table.exitedAt} >= ${table.joinedAt}`,
    ),
    index("idx_employees_status").on(table.status),
  ],
);
// Catatan: index pada nip dan user_id tidak diperlukan karena keduanya sudah UNIQUE

export const employeesRelations = relations(employees, ({ one }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }),
}));
