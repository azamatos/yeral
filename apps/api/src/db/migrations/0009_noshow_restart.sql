ALTER TABLE "clients" ADD COLUMN "no_shows_since" timestamp with time zone;--> statement-breakpoint
-- The switch is now the only block (book Q-127): clients the old count blocked keep their block, switched on.
UPDATE "clients" SET "online_blocked" = true
FROM "booking_rules"
WHERE "booking_rules"."business_id" = "clients"."business_id"
  AND "booking_rules"."block_after_no_shows" > 0
  AND NOT "clients"."online_blocked"
  AND (SELECT count(*) FROM "bookings" WHERE "bookings"."client_id" = "clients"."id" AND "bookings"."status" = 'noshow')
    >= "booking_rules"."block_after_no_shows";
