# The client card (P4 slice 4, PR B11; feat/b11-client-card)

Slice 4's B11 (`log/2026-10-31-slice-4-plan.md` → "PRs, three lanes"): book B-34, B-35, B-36, board B-Client.

## What's there

- `pages/client` at `/w/{slug}/clients/{id}` (route file `clients_.$id.tsx`, so it isn't nested in the list): the head, the
  figures, notes, upcoming, history, reports, the side with the switches and Delete client. `?history=` holds how much history
  shows, `?remove=true` the delete modal, so the list's menu can open it. Not `?modal=`: the routes' search types merge, and
  the list's `modal: 'add'` breaks a `prev` typed with another value.
- `entities/client`: `ClientTags`, shared by the list and the card.
- `AppTopBar` and `WorkspacePage` take `back` (a BackLink, then a thin line). `canRemoveReport` is exported from the
  `booking-drawer` widget and takes any `{ complaint }`, so the card and the drawer share the rule.
- Links in: the list's name, «Open the card» and «Delete client»; the taken number in the add modal; the booking drawer;
  the bookings row menu.

## Traps

- The delete uses `mutateAsync().then`: the card reads back as gone during the mutation, the page swaps to «not in your list»,
  the modal unmounts, and a `mutate` callback would never run, leaving the person on that page.
- `levelCan(level, 'revenue')` is true for a specialist (their own earnings), so the Average check tile also checks
  `!specialist`.
- The screenshots at 1440 and 390 caught what stories can't: `StatTile` defaults to size l, the default Button is secondary, a
  badge stretches in a `TableCell` (a flex column) without `items-start`, `bg-danger-bg` doesn't exist and draws nothing.
- `StatTile`'s caption no longer truncates (the board wraps it), and the page title no longer shows a focus ring when it takes
  focus on a fresh load: it came from the global `:focus-visible` box-shadow.

## Differences from the board

- Visits' caption «total 1,250 TMT» and History's total count aren't there: the card's api sends neither. «Show more» replaces
  «Show all / Show less» with its count, as the book says (*Ýene görkez*).
- The report's booking line and the figures' captions read the history on the card, so an older booking shows only its date.
- Removing a report on the card has no Undo: the api has no restore, and the drawer's Undo needs the whole booking to know the
  rules still allow it.

## Seen, not done here

- `TagInput` offers only the client's own tags: the api has no list of the team's tags (as B10).
- The rules and hours are read with `retry: false` and fall back quietly when a level can't read them.
