-- One waiting move per booking (a move may overlap its booking's time since 0010, so overlaps no longer guard it). Should
-- a race have left two (only ever in a local database: production has no bookings yet), the newest stays and the
-- system withdraws the others.
UPDATE "bookings" SET "status" = 'cancelled', "cancelled_by" = 'system', "cancelled_at" = now(), "updated_at" = now()
WHERE "status" = 'pending' AND "reschedule_of" IS NOT NULL AND "id" NOT IN (
  SELECT DISTINCT ON ("reschedule_of") "id" FROM "bookings"
  WHERE "status" = 'pending' AND "reschedule_of" IS NOT NULL
  ORDER BY "reschedule_of", "created_at" DESC
);--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_one_waiting_move" ON "bookings" USING btree ("reschedule_of") WHERE "bookings"."status" = 'pending';
