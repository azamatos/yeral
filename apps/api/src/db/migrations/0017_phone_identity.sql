CREATE TABLE "identity_checks" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- an existing account was last seen at its latest session, else when it was made
UPDATE "users" SET "last_seen_at" = greatest("users"."created_at", coalesce(
  (SELECT max(greatest("sessions"."last_seen_at", "sessions"."created_at")) FROM "sessions" WHERE "sessions"."user_id" = "users"."id"),
  "users"."created_at"));--> statement-breakpoint
ALTER TABLE "identity_checks" ADD CONSTRAINT "identity_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
