ALTER TABLE "staff" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "ended_by" text;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_ended_by" CHECK ("staff"."ended_by" is null or "staff"."ended_by" in ('self', 'owner'));