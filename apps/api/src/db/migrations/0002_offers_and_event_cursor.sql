ALTER TABLE "bookings" ADD COLUMN "alternative_of" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "txid" "xid8" DEFAULT pg_current_xact_id() NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_alternative_of_bookings_id_fk" FOREIGN KEY ("alternative_of") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_alternativeOf_unique" UNIQUE("alternative_of");