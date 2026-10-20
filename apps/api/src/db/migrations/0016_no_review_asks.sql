-- No review asks (book Q-259): the ones already queued are settled unsent. The client's switch stays as a column until a
-- later release drops it, so the previous api image still runs against this database.
UPDATE "jobs" SET "done_at" = now(), "error" = 'no review asks (book Q-259)'
WHERE "kind" = 'booking.sms' AND "payload"->>'kind' = 'reviewAsk' AND "done_at" IS NULL;
