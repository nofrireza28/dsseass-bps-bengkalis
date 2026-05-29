ALTER TABLE "criteria" ADD COLUMN "scoring_method" varchar(20) DEFAULT 'MULTI_RATER' NOT NULL;--> statement-breakpoint
ALTER TABLE "criteria" ADD COLUMN "calculation_type" varchar(20);--> statement-breakpoint
ALTER TABLE "criteria" ADD COLUMN "type" varchar(10) DEFAULT 'BENEFIT' NOT NULL;--> statement-breakpoint
ALTER TABLE "criteria" ADD CONSTRAINT "scoring_method_check" CHECK ("criteria"."calculation_type" IS NULL OR "criteria"."calculation_type" IN ('DIRECT', 'MONTHLY_AVERAGE', 'ABSENCE_THRESHOLD'));--> statement-breakpoint
ALTER TABLE "criteria" ADD CONSTRAINT "criteria_type_check" CHECK ("criteria"."type" IN ('BENEFIT','COST'));