CREATE TABLE "telegram_link_requests" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"purpose" "code_purpose" NOT NULL,
	"lang" "locale" NOT NULL,
	"chat_id" bigint,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_links" (
	"phone" text PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_updates" (
	"update_id" bigint PRIMARY KEY NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "telegram_link_requests_chat_idx" ON "telegram_link_requests" USING btree ("chat_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_links_chat_idx" ON "telegram_links" USING btree ("chat_id");