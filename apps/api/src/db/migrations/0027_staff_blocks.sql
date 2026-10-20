-- Blocked time (book B-18, Q-204): part of a day closed for one person, so nobody books it; a weekly repeat is a row
-- per week sharing series_id.
CREATE TABLE "staff_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start" integer NOT NULL,
	"end" integer NOT NULL,
	"reason" text,
	"series_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_blocks" ADD CONSTRAINT "staff_blocks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_blocks" ADD CONSTRAINT "staff_blocks_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_blocks" ADD CONSTRAINT "staff_blocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_blocks_business_date_idx" ON "staff_blocks" USING btree ("business_id","date");--> statement-breakpoint
CREATE INDEX "staff_blocks_series_idx" ON "staff_blocks" USING btree ("series_id");