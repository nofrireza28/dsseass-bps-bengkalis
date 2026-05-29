ALTER TABLE "sub_criteria" DROP CONSTRAINT "sub_type_check";--> statement-breakpoint
ALTER TABLE "sub_criteria" ADD CONSTRAINT "sub_type_check" CHECK ("sub_criteria"."type" IN ('BENEFIT', 'COST'));