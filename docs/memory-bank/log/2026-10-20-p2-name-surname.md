# Name and surname (feat/p2-3-name-surname)

- Changed: P2 step 3 (book Q-156). Accounts keep the first name (`users.name`) and an optional surname
  (`users.surname`; migration 0018 splits existing names at the first whitespace, as the old api did, no-break spaces
  included). At most 40 characters each (`NAME_MAX`). The rules live in
  `@yeral/domain/names`: `splitName`, `fullName` (what businesses see, also the client record's and booking's name),
  `reviewName` ("Aýjemal G."). `/v1` stays additive: `me.name` is still the whole name, with `firstName` and `surname`
  beside it; `PATCH /v1/me` takes `firstName` and `surname` (null or empty clears it) and still takes the old `name`,
  split the same way (sent back unchanged, as read, it changes nothing), but not both at once; a surname without a
  first name is refused. A review of an account without a name is signed with the booking's name.
- Rollback: the previous api image shows only the first name until this release is out, and a name it writes after
  the migration (deploy window, rollback) stays in one field; production has no accounts yet.
- Known: `firstName` takes what it's given; a whole name typed into it is published whole on reviews. The inline name
  step gets its surname field with the design (Design to fix).
- Also: 04-rules lost a stale **Code differs** line about deleted accounts' reviews (fixed in #54).
- Follow-ups: the design draws the optional surname in the inline name step and on the link page (07a C-18, C-39).
