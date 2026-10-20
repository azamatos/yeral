# Name and surname (feat/p2-3-name-surname)

- Changed: P2 step 3 (book Q-156). Accounts keep the first name (`users.name`) and an optional surname
  (`users.surname`, migration 0018 splits existing names at the first space; safe to run twice). The rules live in
  `@yeral/domain/names`: `splitName`, `fullName` (what businesses see, also the client record's and booking's name),
  `reviewName` ("Aýjemal G."). `/v1` stays additive: `me.name` is still the whole name, with `firstName` and `surname`
  beside it; `PATCH /v1/me` takes `firstName` and `surname` (null or empty clears it) and still takes the old `name`,
  split the same way, but not both at once.
- Rollback: the previous api image shows only the first name until this release is out.
- Also: 04-rules lost a stale **Code differs** line about deleted accounts' reviews (fixed in #54).
- Follow-ups: the design draws the optional surname in the inline name step and on the link page (07a C-18, C-39).
