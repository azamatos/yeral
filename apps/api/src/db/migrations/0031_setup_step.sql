CREATE TYPE "public"."setup_step" AS ENUM('business', 'address', 'hours', 'services', 'team', 'rules', 'done');--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "setup_step" "setup_step";