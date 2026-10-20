ALTER TABLE "bookings" ADD COLUMN "expiry_warned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "expiry_told_at" timestamp with time zone;