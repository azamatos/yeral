ALTER TYPE "public"."business_cancel_reason" ADD VALUE 'business_closed';--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "closed_reason" text;