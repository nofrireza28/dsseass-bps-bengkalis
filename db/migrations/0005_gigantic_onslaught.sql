CREATE TABLE "objective_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"criteria_id" uuid NOT NULL,
	"final_score" numeric(5, 2),
	"raw_data" jsonb,
	"input_by" uuid,
	"input_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_objective_score" UNIQUE("period_id","employee_id","criteria_id"),
	CONSTRAINT "obj_score_range" CHECK ("objective_scores"."final_score" IS NULL OR ("objective_scores"."final_score" >= 0 AND "objective_scores"."final_score" <= 100))
);
--> statement-breakpoint
ALTER TABLE "objective_scores" ADD CONSTRAINT "objective_scores_period_id_evaluation_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."evaluation_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_scores" ADD CONSTRAINT "objective_scores_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_scores" ADD CONSTRAINT "objective_scores_criteria_id_criteria_id_fk" FOREIGN KEY ("criteria_id") REFERENCES "public"."criteria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_scores" ADD CONSTRAINT "objective_scores_input_by_employees_id_fk" FOREIGN KEY ("input_by") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_obj_scores_period" ON "objective_scores" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "idx_obj_scores_employee" ON "objective_scores" USING btree ("period_id","employee_id");--> statement-breakpoint
CREATE INDEX "idx_obj_scores_criteria" ON "objective_scores" USING btree ("criteria_id");