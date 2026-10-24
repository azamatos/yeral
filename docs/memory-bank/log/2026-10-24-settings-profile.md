# Settings → Business profile, the details (P4 slice 2; feat/settings-profile)

- `pages/settings-profile` (B-Settings `isProfile`, design §8 and §28.5, book B-37): «View your page» (a new tab); when
  the Ýeral team sent the page back (`verification: rejected`), their reason with «Send again»
  (`settings.sendForReview`, toast «Sent again — your page is in review»); **Main details** — the logo, saved at once
  (`settings.setLogo`; JPG / PNG / WebP up to 10 MB, at least 400 × 400 px, cropped to the square in its middle in
  the browser, `lib/square-logo.ts`), the name (80, counter) and the category (the launch categories that take
  appointments, «No category fits? Contact Ýeral»); **About** (1,000, counter; the market's main language only, one
  language at the first release); **Contact and amenities** — the phone for clients (any number, not only a mobile)
  and the api's four amenities; **Pause online booking** (the rules' `onlineEnabled`, switched here; Booking rules
  links here) and, for the owner, «Close this workspace» = «To close this workspace, contact Ýeral» with Contact
  Ýeral, no api call (no delete, §28.5); an admin's group is «Online booking».
- `model/profile.ts` (the form, its problems, the changes: the profile's to `PATCH …/settings/profile`, the pause to
  `PATCH …/settings/rules`) with tests; `model/use-profile-form.ts` follows fork B's `useRulesForm` (reloads while
  untouched, `null` until loaded). One save bar for the details, «Saved» after.
- Review (one round), fixed: «Send again» for the owner only (the api's rule; an admin reads the reason and that the
  owner sends it) and waiting while fixes are unsaved; an About once written can't be emptied while it's the only
  language («Write a few words about your business.»); a complete number that isn't one says so; the logo's limits
  from `@yeral/domain/photos` (decimal bytes, the kind by its bytes), shrunk to 1024, the file named for what the
  browser wrote, any read or draw failure a message; a profile saved before the pause failed stays saved; another
  business's page starts afresh; `BUSINESS_NAME_MAX` moved to `@/shared/config` for both. Left: the counter markup
  repeats `Field`'s (a `FieldCounter` in `@yeral/ui` would serve SettingsRow too); the form keeps `useState` as
  `useRulesForm` does, not TanStack Form (ADR 0011 says TanStack Form for input).
- `@yeral/contract/settings` gained two type exports, `BusinessProfile` and `BusinessProfileUpdate` (types only).
- Not here yet: the photos (PR 2, and the sent-back box's «Go to photos»), the address with the map (PR 3). The board's
  amenities «Kids' corner» and «Free tea» aren't in the api's list (`AMENITIES`: wifi, air conditioning, parking, card
  payment); `womenOnly` isn't drawn and stays as it is.
