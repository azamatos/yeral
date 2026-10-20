-- The booking as the client knows it (date, start, who): what an SMS about a change compares with (book B-24, B-26).
ALTER TABLE "bookings" ADD COLUMN "told" jsonb;--> statement-breakpoint
-- the bookings made before: the client knows them as they are (the seed fills its own the same way)
UPDATE "bookings" b SET "told" = jsonb_build_object(
  'date', b."date",
  'start', b."start",
  'staff', coalesce((SELECT string_agg(coalesce(i."staff_id"::text, ''), ',' ORDER BY i."sort") FROM "booking_items" i WHERE i."booking_id" = b."id"), '')
);--> statement-breakpoint
-- A booking's SMS still to go, found by the booking: small, since done jobs drop out of it.
CREATE INDEX "jobs_waiting_booking_idx" ON "jobs" USING btree (("payload"->>'bookingId')) WHERE "jobs"."done_at" is null;
