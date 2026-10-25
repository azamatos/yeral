CREATE TABLE "business_old_slugs" (
	"slug" text PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"retired_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_old_slugs" ADD CONSTRAINT "business_old_slugs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_old_slugs_business_id_index" ON "business_old_slugs" USING btree ("business_id");