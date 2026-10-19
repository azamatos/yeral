-- When the business last lifted a client's phone-only block (book Q-127): no-shows marked before it don't count. Null
-- counts every no-show, as before, so no client's block changes here.
ALTER TABLE "clients" ADD COLUMN "no_shows_since" timestamp with time zone;
