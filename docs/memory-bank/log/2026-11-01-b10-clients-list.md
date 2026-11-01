# The clients list (P4 slice 4, PR B10; feat/b10-clients-list)

Slice 4's B10 (`log/2026-10-31-slice-4-plan.md` → "PRs, three lanes"): book B-32, B-33, board B-Clients.

## What's there

- `pages/clients`: `model/search.ts` (`?q=&segment=&modal=add`), `ui/clients-page.tsx` (search, chips, rows, a list under
  768), `ui/add-client-modal.tsx` (the number first, whose it is when taken; Save, Save and book).
- Total shows only when the api sends one: it's null without «See revenue», so no permission check in the page.

## For B11

- Add the route `/w/{slug}/clients/{id}`, make the row's name a link, add «Open the card» and «Delete client» to the menu,
  the taken number's «open the card», and «Open the client's card» on the booking drawer (the comment in `ClientBlock`) and
  the bookings row menu.

## Seen, not done here

- The chips' counts and the summary line need counts from the api.
- `TagInput` offers no existing tags here: the api has no list of the team's tags.
