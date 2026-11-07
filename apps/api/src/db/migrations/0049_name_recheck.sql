ALTER TABLE "businesses" ADD COLUMN "recheck_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "recheck" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "pending_name" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "pending_name_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "rejected_name" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "rejected_name_reason" text;--> statement-breakpoint
UPDATE "businesses" SET "recheck_at" = "address_changed_at", "recheck" = '{address}' WHERE "address_changed_at" IS NOT NULL AND "verification" = 'verified';--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "address_changed_at";