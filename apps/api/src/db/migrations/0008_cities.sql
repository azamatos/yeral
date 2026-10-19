CREATE TABLE "cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" jsonb NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
-- businesses and places made before cities are all in the first market's main city (the demo; production has none):
-- that city comes first, and the seed fills in the rest of the list and the names
INSERT INTO "cities" ("id", "name", "lat", "lng", "sort")
SELECT 'ashgabat', '{"en":"Ashgabat","tk":"Aşgabat","ru":"Ашхабад"}'::jsonb, 37.9601, 58.3261, 0
WHERE EXISTS (SELECT 1 FROM "businesses") OR EXISTS (SELECT 1 FROM "places");--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "city_id" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "city_id" text;--> statement-breakpoint
UPDATE "businesses" SET "city_id" = 'ashgabat';--> statement-breakpoint
UPDATE "places" SET "city_id" = 'ashgabat';--> statement-breakpoint
ALTER TABLE "businesses" ALTER COLUMN "city_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ALTER COLUMN "city_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "businesses_city_idx" ON "businesses" USING btree ("city_id");
