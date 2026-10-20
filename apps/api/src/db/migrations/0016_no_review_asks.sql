-- No review asks (book Q-259): the ones already queued are settled unsent, never tried (attempts 0), as the job runner
-- settles any it still meets. The client's switch stays as a column until a later release drops it, so the previous
-- api image still runs against this database; a local database that ran an earlier draft of this migration, which
-- dropped it, gets it back.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notify_review_ask" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "jobs" SET "done_at" = now(), "locked_until" = NULL, "error" = 'dropped: no review asks (book Q-259)'
WHERE "kind" = 'booking.sms' AND "payload"->>'kind' = 'reviewAsk' AND "done_at" IS NULL;
