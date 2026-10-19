-- A move may overlap the booking's own time with the same specialist (book Q-165): a move request's items belong to
-- the booking it would move ("family"), and only items of different families exclude each other.
ALTER TABLE "booking_items" ADD COLUMN "family" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "booking_items_active"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'bookings' THEN
    UPDATE "booking_items" SET "active" = NEW."active" WHERE "booking_id" = NEW."id" AND "active" IS DISTINCT FROM NEW."active";
    RETURN NULL;
  END IF;
  SELECT coalesce("active", false), coalesce("reschedule_of", "id") INTO NEW."active", NEW."family"
    FROM "bookings" WHERE "id" = NEW."booking_id";
  NEW."active" := coalesce(NEW."active", false);
  RETURN NEW;
END
$$;--> statement-breakpoint
UPDATE "booking_items" SET "family" = coalesce("bookings"."reschedule_of", "bookings"."id")
  FROM "bookings" WHERE "bookings"."id" = "booking_items"."booking_id";--> statement-breakpoint
ALTER TABLE "booking_items" DROP CONSTRAINT "booking_items_no_overlap";--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_no_overlap"
  EXCLUDE USING gist ("staff_id" WITH =, "span" WITH &&, "family" WITH <>) WHERE ("active" AND "staff_id" IS NOT NULL);
