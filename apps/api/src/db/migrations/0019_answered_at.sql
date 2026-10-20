-- When the business answered a request (book Q-113): the typical answer time is worked out from these. Bookings from
-- before it was kept have none, so a business shows the line once it has answered 5 requests from now on.
ALTER TABLE "bookings" ADD COLUMN "answered_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "bookings_answered_idx" ON "bookings" USING btree ("business_id","answered_at") WHERE "bookings"."answered_at" is not null;
