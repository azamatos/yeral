-- A business that moves tells the clients with a booking ahead (book Q-215): the address each of them last heard, so a
-- move and back tells nothing, and when and from where the business moved, so its page and those bookings say "New
-- address" (and a move back says nothing new).
ALTER TABLE "bookings" ADD COLUMN "address_told" jsonb;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "moved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "moved_from" jsonb;