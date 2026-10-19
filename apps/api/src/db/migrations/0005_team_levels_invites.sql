CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."level" AS ENUM('owner', 'admin', 'specialist');--> statement-breakpoint
CREATE TYPE "public"."request_answerers" AS ENUM('desk', 'each', 'both');--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"invited_by" uuid,
	"token_hash" text NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invites_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "status" SET DEFAULT 'active'::text;--> statement-breakpoint
-- hand-written: 'disabled' is now 'removed'
UPDATE "staff" SET "status" = 'removed' WHERE "status" = 'disabled';--> statement-breakpoint
DROP TYPE "public"."staff_status";--> statement-breakpoint
CREATE TYPE "public"."staff_status" AS ENUM('active', 'invited', 'removed');--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."staff_status";--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "status" SET DATA TYPE "public"."staff_status" USING "status"::"public"."staff_status";--> statement-breakpoint
ALTER TABLE "booking_rules" ADD COLUMN "request_answerers" "request_answerers" DEFAULT 'both' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "level" "level" DEFAULT 'specialist' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_answer_own" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "last_opened_at" timestamp with time zone;--> statement-breakpoint
-- hand-written (ADR 0025): each member's account and level move onto their staff row, open invites into `invites`;
-- the next migration drops `memberships` and `roles`. Access now comes from the staff row, so a disabled membership
-- makes its row `removed` (the account stays linked, for its kept bookings).
-- members and invites without a staff row get one (not bookable; an invited one waits as `invited`)
INSERT INTO "staff" ("business_id", "name", "phone", "bookable", "status")
SELECT m."business_id", coalesce(u."name", m."phone"), m."phone", false, CASE WHEN m."status" = 'invited' THEN 'invited'::"staff_status" ELSE 'active'::"staff_status" END
FROM "memberships" m LEFT JOIN "users" u ON u."id" = m."user_id"
WHERE m."staff_id" IS NULL AND m."status" IN ('active', 'invited');--> statement-breakpoint
UPDATE "memberships" m SET "staff_id" = s."id"
FROM "staff" s
WHERE m."staff_id" IS NULL AND m."status" IN ('active', 'invited') AND s."business_id" = m."business_id" AND s."phone" = m."phone" AND s."bookable" = false;--> statement-breakpoint
UPDATE "staff" SET "user_id" = m."user_id", "level" = (CASE r."template" WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' ELSE 'specialist' END)::"level",
  "status" = CASE WHEN m."status" = 'disabled' THEN 'removed'::"staff_status" ELSE "staff"."status" END
FROM "memberships" m JOIN "roles" r ON r."id" = m."role_id"
WHERE m."staff_id" = "staff"."id" AND m."status" <> 'invited';--> statement-breakpoint
-- old data could break the new invariants: keep the earliest owner of a business (the others become administrators)
-- and the earliest row of an account in a business
UPDATE "staff" SET "level" = 'admin'
WHERE "id" IN (SELECT "id" FROM (SELECT "id", row_number() OVER (PARTITION BY "business_id" ORDER BY "created_at", "id") AS n
  FROM "staff" WHERE "level" = 'owner' AND "status" = 'active') o WHERE o.n > 1);--> statement-breakpoint
UPDATE "staff" SET "user_id" = NULL
WHERE "id" IN (SELECT "id" FROM (SELECT "id", row_number() OVER (PARTITION BY "business_id", "user_id" ORDER BY "created_at", "id") AS n
  FROM "staff" WHERE "user_id" IS NOT NULL) d WHERE d.n > 1);--> statement-breakpoint
INSERT INTO "invites" ("business_id", "staff_id", "phone", "token_hash", "status", "sent_at", "expires_at")
SELECT m."business_id", m."staff_id", m."phone", encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'), 'pending', m."created_at", m."created_at" + interval '7 days'
FROM "memberships" m WHERE m."status" = 'invited' AND m."staff_id" IS NOT NULL;--> statement-breakpoint
UPDATE "staff" SET "level" = (CASE r."template" WHEN 'admin' THEN 'admin' ELSE 'specialist' END)::"level"
FROM "memberships" m JOIN "roles" r ON r."id" = m."role_id"
WHERE m."staff_id" = "staff"."id" AND m."status" = 'invited';--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invites_phone_idx" ON "invites" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "invites_one_pending" ON "invites" USING btree ("business_id","phone") WHERE "invites"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_user_idx" ON "staff" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_business_user" ON "staff" USING btree ("business_id","user_id") WHERE "staff"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_one_owner" ON "staff" USING btree ("business_id") WHERE "staff"."level" = 'owner' and "staff"."status" = 'active';--> statement-breakpoint
-- hand-written: old rows that break the new checks (the old demo had specialists without the app and without a phone)
-- count as with the app until the owner adds a phone; owners always have the app
UPDATE "staff" SET "has_app" = true WHERE NOT "has_app" AND ("phone" IS NULL OR "level" = 'owner');--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_phone_without_app" CHECK ("staff"."has_app" or "staff"."phone" is not null);--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_owner_has_app" CHECK ("staff"."level" <> 'owner' or "staff"."has_app");