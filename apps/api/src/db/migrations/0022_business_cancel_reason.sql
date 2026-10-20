-- The reason the business picked when it cancelled a booking (book B-27): "The client called to cancel" (recorded as the
-- client's cancel), "The specialist can't come in", "Other reason" (in words, in cancel_reason).
CREATE TYPE "public"."business_cancel_reason" AS ENUM('client_called', 'staff_away', 'other');--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "business_cancel_reason" "business_cancel_reason";
