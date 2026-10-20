-- Busy elsewhere (book Q-272): one person's items in different workspaces may not overlap, as one specialist's may
-- not. An item carries the specialist's account when it's booked ("person", from the staff row's user_id); the item
-- trigger sets it on insert and when the item's specialist changes, and leaves it when a staff row is linked later.
-- Items booked before this migration get no person, so no overlap from before can stop it.
ALTER TABLE "booking_items" ADD COLUMN "person" uuid;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_person_users_id_fk" FOREIGN KEY ("person") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_items_person_date_idx" ON "booking_items" USING btree ("person","date") WHERE "booking_items"."person" is not null;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "booking_items_active"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  booking_active boolean;
  booking_family uuid;
BEGIN
  IF TG_TABLE_NAME = 'bookings' THEN
    UPDATE "booking_items" SET "active" = NEW."active" WHERE "booking_id" = NEW."id" AND "active" IS DISTINCT FROM NEW."active";
    RETURN NULL;
  END IF;
  SELECT "active", coalesce("reschedule_of", "id") INTO booking_active, booking_family
    FROM "bookings" WHERE "id" = NEW."booking_id";
  -- no booking: the foreign key reports it
  NEW."active" := coalesce(booking_active, false);
  NEW."family" := coalesce(booking_family, NEW."family");
  IF TG_OP = 'INSERT' OR NEW."staff_id" IS DISTINCT FROM OLD."staff_id" THEN
    NEW."person" := (SELECT "user_id" FROM "staff" WHERE "id" = NEW."staff_id");
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
-- a move request may overlap the booking it would move (same family), as with one specialist (migration 0010)
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_person_no_overlap"
  EXCLUDE USING gist ("person" WITH =, "span" WITH &&, "family" WITH <>) WHERE ("active" AND "person" IS NOT NULL);
