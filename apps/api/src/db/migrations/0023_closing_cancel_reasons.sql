-- A business cancel with 3 offered times when it closes on a special day ("closed", the day's name in cancel_reason) or
-- its hours change over bookings ("hours"), book B-39, B-40, Q-211.
ALTER TYPE "public"."business_cancel_reason" ADD VALUE 'closed';--> statement-breakpoint
ALTER TYPE "public"."business_cancel_reason" ADD VALUE 'hours';
