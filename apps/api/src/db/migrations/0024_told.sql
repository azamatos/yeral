-- The booking as the client knows it (date, start, who): what an SMS about a change compares with (book B-24, B-26).
ALTER TABLE "bookings" ADD COLUMN "told" jsonb;--> statement-breakpoint
-- A booking's SMS still to go, found by the booking: small, since done jobs drop out of it.
CREATE INDEX "jobs_waiting_booking_idx" ON "jobs" USING btree (("payload"->>'bookingId')) WHERE "jobs"."done_at" is null;
