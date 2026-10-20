-- Internal statuses (book B-29, F-104): a business's team-only markers for its confirmed bookings (the two presets and up
-- to three of its own), and the one a booking carries.
CREATE TABLE "internal_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"preset" text,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "internal_status_id" uuid;--> statement-breakpoint
ALTER TABLE "internal_statuses" ADD CONSTRAINT "internal_statuses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "internal_statuses_name" ON "internal_statuses" USING btree ("business_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "internal_statuses_preset" ON "internal_statuses" USING btree ("business_id","preset") WHERE "internal_statuses"."preset" is not null;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_internal_status_id_internal_statuses_id_fk" FOREIGN KEY ("internal_status_id") REFERENCES "public"."internal_statuses"("id") ON DELETE set null ON UPDATE no action;