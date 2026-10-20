ALTER TABLE "invites" ADD COLUMN "expiry_told_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "invites_untold_idx" ON "invites" USING btree ("expires_at") WHERE "invites"."status" = 'pending' and "invites"."expiry_told_at" is null;--> statement-breakpoint
-- invites that ran out before this: told already, so the first tick doesn't tell them all at once
UPDATE "invites" SET "expiry_told_at" = "expires_at" WHERE "status" = 'pending' AND "expires_at" <= now();
