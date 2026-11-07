# 2026-11-07 · A new name waits for Ýeral; other changes go on the «check again» list

Branch `feat/name-recheck`, main checkout. The owner's decision of 07.11.2026, which changes book Q-275 («no automatic
re-check»): a joke or a swear word in a business name must never reach clients. The lead wrote the decision into the
book; this note says what was built.

## Done

- **Migration `0049_name_recheck`**: `businesses.pending_name`, `pending_name_at` (the new name waiting, and since when),
  `rejected_name`, `rejected_name_reason` (the last one turned down, and why), `recheck_at` + `recheck text[]` (the
  re-check: the newest change's time, and what changed since the last check: `address` · `about` · `photos` · `logo`,
  `RECHECK_CHANGES` in `@yeral/domain/model`). `address_changed_at` is gone: the migration copies a verified business's
  into `recheck_at` with `{address}`, then drops it (generated in two steps and merged into one file, so drizzle-kit
  didn't ask whether it was a rename). Its snapshot still holds `users.demo` and `businesses.sandbox` (out of the Drizzle
  schema since #316, dropped by their own PR once the server's rows are gone): they were put back in the schema for the
  run, so this migration drops neither and the next `pnpm db:generate` still writes that drop.
- **The hold** (`renamed` in `apps/api/src/modules/settings/service.ts`): a verified, finished business's new name goes
  to `pending_name`; `businesses.name` stays the approved one, so clients, the page, search, sitemap/JSON-LD and every
  SMS keep it with no other change. Renamed again → the new one replaces the one waiting (and its time); the same
  waiting name again → nothing; back to the approved name → the waiting one goes. Not verified yet (in review, sent back)
  or a draft (`setupStep`) → saved at once. Any rename lets the last turn-down go.
- **The re-check marks** (`settings/recheck.ts` `recheckOf`): a move (as before, `moved`), an About with a language
  written anew, a photo added, a logo set. Live at once; `recheck_at` = now, `recheck` = the union. Removing a photo,
  the logo or a language, or a new order, marks nothing.
- **Admin** (`modules/admin/businesses.ts`, `business-routes.ts`): the `moved` list (cms «Check again») holds verified,
  open businesses with a re-check or a waiting name, the longest waiting first (`least(recheck_at, pending_name_at)`).
  `POST /v1/admin/businesses/{id}/name/approve` `{ name }` and `…/name/reject` `{ name, reason }`: `name` is the waiting
  one the team looked at (a newer one → `invalid_status`), as `verify?moved=` does for the re-check. Approved: the name
  becomes it, the owner gets an SMS (`sms.nameApproved`). Turned down: the owner reads the reason in Settings →
  Business profile and by SMS (`sms.nameRejected`, link to the workspace). Both recorded (`business.name_approved` with
  `{ from, to }`, `business.name_rejected` with the reason and `{ name }`). The re-check is cleared by the existing
  `verify?moved=<recheck.at>`, recorded as `business.rechecked` with `{ what }` (it was `business.move_checked`; old rows
  keep their label in the cms). The admin search also matches the waiting name. Name SMS have their own dedupe key, so
  at night a name verdict doesn't replace a waiting «is open» (or the other way round).
- **Contract/sdk**: `AdminBusinessItem.recheck { at, what }`, `.pendingName { name, at }`; `addressChangedAt` kept,
  `@deprecated` (= `recheck.at` when `address` is among what changed), since `/v1` changes stay additive.
  `BusinessProfile.pendingName`, `.nameRejected { name, reason }`. `sdk.admin.approveName(id)`, `rejectName(id)`.
- **Business app** (Settings → Business profile, `NameRow`): the field holds the waiting name with a warning field
  message «Waiting for Ýeral’s check. Until it’s approved, clients see “…”.» (shown while the field holds it); a
  turn-down is a small danger callout with the team's reason (the sent-back box's pattern, smaller, in the field's row).
  `formFrom` reads `pendingName ?? name`, so typing the approved name back sends it and drops the waiting one.
- **CMS**: state `moved` → `recheck` («Check again», also for a waiting name); list rows say «New name: …» and «Changed:
  address and photos»; the business page's notes say old → new and what changed with when; actions «Approve the new
  name», «Turn down the new name» (reason modal), «Checked, all fine».
- **Tests**: `apps/api/src/modules/admin/recheck.test.ts` (hold, replace, same name, rename back, specialist 403, hidden
  holds too, approve with SMS and the stale name refused, turn down with reason/SMS/next rename, unverified and draft
  direct, about/photo/logo marks and what doesn't mark, a move joins, verify clears only the seen check, a waiting name
  outlives the re-check, nothing marked in review); the existing move tests updated to the new columns. Stories:
  business `RenameWaits`, `NameTurnedDown`; cms `CheckAgain` (list and page), `NewName`, `NewNameTurnedDown`.

## Decisions taken here

- **Hidden or closed**: the hold follows `verification` only. A hidden business is still verified, so its new name
  waits (shown again, it mustn't carry an unchecked name). A closed one can't be decided on (the admin tool refuses
  every verdict on a closed business, as before): a name waiting stays waiting until it's opened again.
- **Un-verified with a name waiting**: «Send back» on a live business leaves the waiting name as it is (the team can
  still approve or turn it down); a rename while not verified saves at once and drops it.
- **Re-check marks only a verified business** (a move used to mark any finished one; nothing listed or used the mark of
  one in review, whose Verify checks the whole page anyway).
- **The approval SMS** says only that the name is approved, nothing about clients seeing it (a hidden page isn't seen).
- **Turkmen and Russian SMS** for the two new texts were written here (owners get SMS in their language): a native
  check is welcome. The apps' new strings are English only, as the apps are for now.

## Left

- The client site and the business app's own header keep showing the approved name while one waits: as decided.
- tk/ru for the business app's and the cms's new strings with the rest of those apps.
- The cms history shows «New name approved» without the names; `admin_actions.details` has them if wanted.
