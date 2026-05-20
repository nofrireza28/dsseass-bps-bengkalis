import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
  check,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const criteria = pgTable(
  "criteria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 20 }).unique().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    weight: numeric("weight", { precision: 5, scale: 4 }).notNull(),
    hasSubCriteria: boolean("has_sub_criteria").notNull().default(false),
    displayOrder: integer("display_order").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check("weight_range", sql`${table.weight} >= 0 AND ${table.weight} <= 1`),
    index("idx_criteria_active").on(table.isActive, table.displayOrder),
  ],
);

export const subCriteria = pgTable(
  "sub_criteria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    criteriaId: uuid("criteria_id")
      .notNull()
      .references(() => criteria.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 20 }).unique().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    weight: numeric("weight", { precision: 5, scale: 4 }).notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "sub_weight_range",
      sql`${table.weight} >= 0 AND ${table.weight} <= 1`,
    ),
    index("idx_sub_criteria_parent").on(table.criteriaId, table.displayOrder),
  ],
);

export const criteriaRelations = relations(criteria, ({ many }) => ({
  subCriteria: many(subCriteria),
}));

export const subCriteriaRelations = relations(subCriteria, ({ one }) => ({
  criteria: one(criteria, {
    fields: [subCriteria.criteriaId],
    references: [criteria.id],
  }),
}));
