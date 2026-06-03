ALTER TABLE "evaluation_periods" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "evaluation_periods" ALTER COLUMN "status" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "evaluation_periods" ALTER COLUMN "status" SET DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD COLUMN "period_type" varchar(20) DEFAULT 'QUARTERLY' NOT NULL;--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD COLUMN "year" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD COLUMN "period_index" integer;--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD CONSTRAINT "evaluation_periods_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_periods_year_type" ON "evaluation_periods" USING btree ("year","period_type");--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD CONSTRAINT "period_type_check" CHECK ("evaluation_periods"."period_type" IN ('MONTHLY', 'QUARTERLY', 'SEMESTER', 'ANNUAL', 'CUSTOM'));--> statement-breakpoint
ALTER TABLE "evaluation_periods" ADD CONSTRAINT "period_year_check" CHECK ("evaluation_periods"."year" >= 2020 AND "evaluation_periods"."year" <= 2100);