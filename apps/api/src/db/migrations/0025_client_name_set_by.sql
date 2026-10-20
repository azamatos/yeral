-- The team's booking that gave a nameless client record its name: undoing it takes the name back (book B-24).
ALTER TABLE "clients" ADD COLUMN "name_set_by" uuid;
