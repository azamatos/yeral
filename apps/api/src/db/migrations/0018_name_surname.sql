-- Name and surname as two fields (book Q-156). An account's one name field is split at its first space: the first word
-- stays as the first name, the rest becomes the surname. The previous api image still runs on this: it shows only the
-- first name until this release is out.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "surname" text;--> statement-breakpoint
UPDATE "users"
SET "surname" = nullif(btrim(substring(btrim("name") from position(' ' in btrim("name")) + 1)), ''),
    "name" = split_part(btrim("name"), ' ', 1)
WHERE "surname" IS NULL AND position(' ' in btrim("name")) > 0;
