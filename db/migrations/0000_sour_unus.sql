CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"email_verified" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"nip" varchar(50) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"position" varchar(255),
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" date,
	"exited_at" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employees_nip_unique" UNIQUE("nip"),
	CONSTRAINT "status_check" CHECK ("employees"."status" IN ('ACTIVE', 'INACTIVE', 'ON_LEAVE')),
	CONSTRAINT "valid_employment_dates" CHECK ("employees"."exited_at" IS NULL OR "employees"."exited_at" >= "employees"."joined_at")
);
--> statement-breakpoint
CREATE TABLE "criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"weight" numeric(5, 4) NOT NULL,
	"has_sub_criteria" boolean DEFAULT false NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "criteria_code_unique" UNIQUE("code"),
	CONSTRAINT "weight_range" CHECK ("criteria"."weight" >= 0 AND "criteria"."weight" <= 1)
);
--> statement-breakpoint
CREATE TABLE "sub_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criteria_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"weight" numeric(5, 4) NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sub_criteria_code_unique" UNIQUE("code"),
	CONSTRAINT "sub_weight_range" CHECK ("sub_criteria"."weight" >= 0 AND "sub_criteria"."weight" <= 1)
);
--> statement-breakpoint
CREATE TABLE "evaluation_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"opened_at" timestamp,
	"opened_by" uuid,
	"closed_at" timestamp,
	"closed_by" uuid,
	"awaiting_approval_at" timestamp,
	"finalized_at" timestamp,
	"finalized_by" uuid,
	"approval_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "period_status_check" CHECK ("evaluation_periods"."status" IN ('DRAFT', 'OPEN', 'CLOSED', 'AWAITING_APPROVAL', 'FINALIZED')),
	CONSTRAINT "valid_period_dates" CHECK ("evaluation_periods"."end_date" > "evaluation_periods"."start_date")
);
--> statement-breakpoint
CREATE TABLE "period_participants" (
	"period_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"is_evaluator" boolean DEFAULT true NOT NULL,
	"is_evaluatee" boolean DEFAULT true NOT NULL,
	"notes" text,
	CONSTRAINT "period_participants_period_id_employee_id_pk" PRIMARY KEY("period_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "evaluation_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"sub_criteria_id" uuid NOT NULL,
	"raw_score" numeric(5, 2) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_score_per_subcriteria" UNIQUE("evaluation_id","sub_criteria_id"),
	CONSTRAINT "score_range" CHECK ("evaluation_scores"."raw_score" >= 60 AND "evaluation_scores"."raw_score" <= 100)
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"evaluator_id" uuid NOT NULL,
	"evaluatee_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_evaluation" UNIQUE("period_id","evaluator_id","evaluatee_id"),
	CONSTRAINT "eval_status_check" CHECK ("evaluations"."status" IN ('DRAFT', 'SUBMITTED')),
	CONSTRAINT "no_self_evaluation" CHECK ("evaluations"."evaluator_id" != "evaluations"."evaluatee_id")
);
--> statement-breakpoint
CREATE TABLE "ranking_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"calculated_by" uuid NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"calculation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "ranking_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calculation_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"aggregated_scores" jsonb NOT NULL,
	"normalized_scores" jsonb NOT NULL,
	"final_score" numeric(8, 6) NOT NULL,
	"rank_position" integer NOT NULL,
	"total_evaluators" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_ranking_per_calculation" UNIQUE("calculation_id","employee_id")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_criteria" ADD CONSTRAINT "sub_criteria_criteria_id_criteria_id_fk" FOREIGN KEY ("criteria_id") REFERENCES "public"."criteria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD CONSTRAINT "evaluation_periods_opened_by_employees_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD CONSTRAINT "evaluation_periods_closed_by_employees_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD CONSTRAINT "evaluation_periods_finalized_by_employees_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period_participants" ADD CONSTRAINT "period_participants_period_id_evaluation_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."evaluation_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period_participants" ADD CONSTRAINT "period_participants_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_sub_criteria_id_sub_criteria_id_fk" FOREIGN KEY ("sub_criteria_id") REFERENCES "public"."sub_criteria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_period_id_evaluation_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."evaluation_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_id_employees_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluatee_id_employees_id_fk" FOREIGN KEY ("evaluatee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_calculations" ADD CONSTRAINT "ranking_calculations_period_id_evaluation_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."evaluation_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_calculations" ADD CONSTRAINT "ranking_calculations_calculated_by_employees_id_fk" FOREIGN KEY ("calculated_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_results" ADD CONSTRAINT "ranking_results_calculation_id_ranking_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."ranking_calculations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_results" ADD CONSTRAINT "ranking_results_period_id_evaluation_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."evaluation_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_results" ADD CONSTRAINT "ranking_results_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires" ON "sessions" USING btree ("expires");--> statement-breakpoint
CREATE INDEX "idx_user_roles_user" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_role" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_employees_status" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_criteria_active" ON "criteria" USING btree ("is_active","display_order");--> statement-breakpoint
CREATE INDEX "idx_sub_criteria_parent" ON "sub_criteria" USING btree ("criteria_id","display_order");--> statement-breakpoint
CREATE INDEX "idx_periods_status" ON "evaluation_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_periods_dates" ON "evaluation_periods" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_participants_period" ON "period_participants" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "idx_scores_evaluation" ON "evaluation_scores" USING btree ("evaluation_id");--> statement-breakpoint
CREATE INDEX "idx_scores_subcriteria" ON "evaluation_scores" USING btree ("sub_criteria_id");--> statement-breakpoint
CREATE INDEX "idx_evaluations_period" ON "evaluations" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "idx_evaluations_evaluator" ON "evaluations" USING btree ("period_id","evaluator_id");--> statement-breakpoint
CREATE INDEX "idx_evaluations_evaluatee" ON "evaluations" USING btree ("period_id","evaluatee_id");--> statement-breakpoint
CREATE INDEX "idx_evaluations_status" ON "evaluations" USING btree ("period_id","status");--> statement-breakpoint
CREATE INDEX "idx_ranking_calc_period" ON "ranking_calculations" USING btree ("period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_current_calculation_per_period" ON "ranking_calculations" USING btree ("period_id") WHERE "ranking_calculations"."is_current" = true;--> statement-breakpoint
CREATE INDEX "idx_ranking_calculation" ON "ranking_results" USING btree ("calculation_id","rank_position");--> statement-breakpoint
CREATE INDEX "idx_ranking_period_employee" ON "ranking_results" USING btree ("period_id","employee_id");--> statement-breakpoint
CREATE INDEX "idx_ranking_employee" ON "ranking_results" USING btree ("employee_id");