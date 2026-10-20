CREATE TYPE "public"."review_report_reason" AS ENUM('fake', 'insulting', 'other_business', 'spam', 'other');--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "reply_by" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "reply_deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "report_reason" "review_report_reason";--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "report_text" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "reported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "reported_by" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "recounted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "cleared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reply_by_staff_id_fk" FOREIGN KEY ("reply_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reported_by_staff_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_reported_idx" ON "reviews" USING btree ("reported_at") WHERE "reviews"."reported_at" is not null and "reviews"."recounted_at" is null and "reviews"."cleared_at" is null;