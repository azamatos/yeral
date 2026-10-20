-- A link works only for the phone it went to (book Q-168). Links made before this didn't record it: they stop working.
ALTER TABLE "booking_links" ADD COLUMN "sent_to" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "booking_links" ALTER COLUMN "sent_to" DROP DEFAULT;
