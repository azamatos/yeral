# Settings → Business profile, the address (P4 slice 2; feat/settings-address)

- **`features/edit-address`** (moved from the wizard's step 3): `model/address.ts` (the form, its limits, its problems,
  what it sends; its test moved with it), `useAddressForm(slug, on)` (loads the profile and the cities, keeps the
  edits, searches after a pause in the typing, follows the profile while untouched, `save()` throws what the api said)
  and `AddressFields` (the city, the address searched and picked or typed and pinned by hand, MapFrame with the pin or
  the approximate circle, «I work from home», the floor and the entrance note; `disabled` while a save runs). The
  wizard's `useAddressStep` is now its header around them and Continue's save.
- **Business profile's Address** (B-Settings «Address»): the same fields, «Moved? Change the address here. Your
  bookings, clients and reviews stay; Ýeral may check the new address.» and «Another address at the same time is a
  new workspace: Create a business» (→ `/setup/business`). It joins the page's save bar: the details and the address
  are each sent to `PATCH …/settings/profile` only when they changed, «Saved» after.
- The board's Settings layout (city and street side by side, a 260 map, the home switch as a settings row) isn't
  copied: the wizard's layout is reused as the nearest drawn pattern (the coordinator's call: one form for both).
