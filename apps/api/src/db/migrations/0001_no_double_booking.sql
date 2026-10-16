-- Double booking is impossible at the database level (ADR 0005, ADR 0017): active appointment items exclude each
-- other per specialist and date over [start, end + buffer); active table bookings per table and date.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_no_overlap"
  EXCLUDE USING gist ("staff_id" WITH =, "date" WITH =, "span" WITH &&) WHERE ("active" AND "staff_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_table_no_overlap"
  EXCLUDE USING gist ("table_id" WITH =, "date" WITH =, "span" WITH &&) WHERE ("active" AND "table_id" IS NOT NULL);--> statement-breakpoint
-- A business day ends by midnight (business spec §11).
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_minutes" CHECK ("start" >= 0 AND "start" < "end" AND "end" + "buffer_after" <= 1440);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_minutes" CHECK ("start" >= 0 AND "start" < "end" AND "end" <= 1440);--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating" CHECK ("rating" BETWEEN 1 AND 5);
