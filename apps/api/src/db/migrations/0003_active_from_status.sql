-- `active` can't drift from the status any more (M2 review): bookings compute it, booking items copy it by trigger, so
-- the no-overlap constraints always see what the bookings say, whoever changes a status.
ALTER TABLE "booking_items" ALTER COLUMN "active" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_table_no_overlap";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "active";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "active" boolean GENERATED ALWAYS AS ("status" in ('pending', 'confirmed')) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_table_no_overlap"
  EXCLUDE USING gist ("table_id" WITH =, "date" WITH =, "span" WITH &&) WHERE ("active" AND "table_id" IS NOT NULL);--> statement-breakpoint
CREATE FUNCTION "booking_items_active"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'bookings' THEN
    UPDATE "booking_items" SET "active" = NEW."active" WHERE "booking_id" = NEW."id" AND "active" IS DISTINCT FROM NEW."active";
    RETURN NULL;
  END IF;
  NEW."active" := coalesce((SELECT "active" FROM "bookings" WHERE "id" = NEW."booking_id"), false);
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "bookings_active_to_items" AFTER UPDATE OF "status" ON "bookings"
  FOR EACH ROW EXECUTE FUNCTION "booking_items_active"();--> statement-breakpoint
CREATE TRIGGER "booking_items_active_from_booking" BEFORE INSERT OR UPDATE ON "booking_items"
  FOR EACH ROW EXECUTE FUNCTION "booking_items_active"();--> statement-breakpoint
UPDATE "booking_items" SET "active" = "bookings"."active" FROM "bookings" WHERE "bookings"."id" = "booking_items"."booking_id";
