CREATE TYPE "public"."block_kind" AS ENUM('training', 'break', 'personal', 'other');--> statement-breakpoint
ALTER TABLE "staff_blocks" ADD COLUMN "kind" "block_kind";