-- Name and surname as two fields (book Q-156). An account's one name field is split as the old api split it, at the
-- first whitespace (a no-break space too; runs of it count as one): the first word stays as the first name, the rest
-- becomes the surname. The previous api image still runs on this: it shows only the first name until this release is
-- out.
ALTER TABLE "users" ADD COLUMN "surname" text;--> statement-breakpoint
UPDATE "users" SET
  "name" = split_part("t"."one", ' ', 1),
  "surname" = nullif(substring("t"."one" from position(' ' in "t"."one") + 1), '')
FROM (
  SELECT "id", btrim(regexp_replace("name", '[[:space:]' || chr(160) || ']+', ' ', 'g')) AS "one" FROM "users" WHERE "name" IS NOT NULL
) AS "t"
WHERE "users"."id" = "t"."id" AND position(' ' in "t"."one") > 0;--> statement-breakpoint
UPDATE "users" SET "name" = btrim(regexp_replace("name", '[[:space:]' || chr(160) || ']+', ' ', 'g'))
WHERE "name" IS NOT NULL AND "surname" IS NULL;
