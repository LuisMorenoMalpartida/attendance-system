ALTER TYPE "public"."attendance_type" ADD VALUE 'active_break_start';--> statement-breakpoint
ALTER TYPE "public"."attendance_type" ADD VALUE 'active_break_end';--> statement-breakpoint
ALTER TYPE "public"."attendance_type" ADD VALUE 'bathroom_start';--> statement-breakpoint
ALTER TYPE "public"."attendance_type" ADD VALUE 'bathroom_end';--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_name_unique";--> statement-breakpoint
ALTER TABLE "attendance_records" ALTER COLUMN "timestamp" SET DATA TYPE text;