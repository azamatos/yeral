CREATE TYPE "public"."admin_role" AS ENUM('superadmin', 'admin');--> statement-breakpoint
CREATE TABLE "admin_challenges" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"admin_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "role" "admin_role" DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_challenges" ADD CONSTRAINT "admin_challenges_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_challenges_admin_idx" ON "admin_challenges" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admins_one_superadmin" ON "admins" USING btree ("role") WHERE "admins"."role" = 'superadmin';--> statement-breakpoint
-- by hand: the earliest account (the owner's, made first by admin-invite) is the superadmin; every other one stays an admin
UPDATE "admins" SET "role" = 'superadmin' WHERE "id" = (SELECT "id" FROM "admins" ORDER BY "created_at", "login" LIMIT 1);
