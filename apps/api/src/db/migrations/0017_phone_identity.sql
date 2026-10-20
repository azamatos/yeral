CREATE TABLE "identity_checks" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- existing accounts count as used at this release: none is asked "Is this you?" before 6 months from it (book Q-270)
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- a business's record of someone whose number passed on keeps its history without the number
ALTER TABLE "clients" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "identity_checks" ADD CONSTRAINT "identity_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
