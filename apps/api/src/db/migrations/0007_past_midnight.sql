-- A business day may run past midnight (book Q-105): minutes reach 2880, and a booking late on one day must collide
-- with one early the next, so `span` is in absolute business-local minutes and the no-overlap constraints drop "date".
ALTER TABLE "booking_items" DROP CONSTRAINT "booking_items_no_overlap";--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_table_no_overlap";--> statement-breakpoint
ALTER TABLE "booking_items" DROP CONSTRAINT "booking_items_minutes";--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_minutes";--> statement-breakpoint
ALTER TABLE "booking_items" drop column "span";--> statement-breakpoint
ALTER TABLE "booking_items" ADD COLUMN "span" "int4range" GENERATED ALWAYS AS (int4range(("date" - date '2000-01-01') * 1440 + "start", ("date" - date '2000-01-01') * 1440 + "end" + "buffer_after")) STORED;--> statement-breakpoint
ALTER TABLE "bookings" drop column "span";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "span" "int4range" GENERATED ALWAYS AS (int4range(("date" - date '2000-01-01') * 1440 + "start", ("date" - date '2000-01-01') * 1440 + "end")) STORED;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_no_overlap"
  EXCLUDE USING gist ("staff_id" WITH =, "span" WITH &&) WHERE ("active" AND "staff_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_table_no_overlap"
  EXCLUDE USING gist ("table_id" WITH =, "span" WITH &&) WHERE ("active" AND "table_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_minutes" CHECK ("start" >= 0 AND "start" < "end" AND "end" + "buffer_after" <= 2880);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_minutes" CHECK ("start" >= 0 AND "start" < "end" AND "end" <= 2880);
