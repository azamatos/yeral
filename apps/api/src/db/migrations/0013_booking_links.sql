CREATE TABLE "booking_links" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_links" ADD CONSTRAINT "booking_links_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_links_booking_idx" ON "booking_links" USING btree ("booking_id");