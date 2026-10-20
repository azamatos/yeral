-- A booking's SMS still to go, found by the booking when a later one replaces them (book B-24, B-26): small, since done
-- jobs drop out of it.
CREATE INDEX "jobs_waiting_booking_idx" ON "jobs" USING btree (("payload"->>'bookingId')) WHERE "jobs"."done_at" is null;
