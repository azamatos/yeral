# Settings → Services, the list (P4 slice 2; feat/settings-services)

- **`pages/settings-services`** at `/w/{slug}/settings/services` (B-Services, design §8 «Hyzmatlar» and §28.6, book
  B-38), over `sdk.settings.menu`. The whole width of the pane: `SettingsPage` takes `wide` (`.pane.pw`).
  - The lead: «5 services · 3 groups. Clients see them in this order.»
  - The columns: Service · Duration · Price · Who does it · Online. Under 1024 there is no «Who does it»; on a phone
    the name has «60 min · 80 TMT · Aýna» under it, next to the switch.
  - Group by group, with the name and «3 services», and «No services in this group yet.» for an empty one.
  - Each row:
    - the name and the description;
    - the length, with the service's own buffer («+15 min buffer», «no buffer»);
    - the price (`fmt.price`), plus «400 TMT · not shown to clients» under a price at the place;
    - who does it (`whoDoes`): up to 3 avatars, a name or «2 specialists», «No one» in red, and «+ 1 invited»;
    - the online switch, which saves at once (`updateService({ online })`) with the board's toast. Off, it shows «Not
      bookable online».
- Review (one round, `code-review` high), 8 of 10 fixed:
  - The columns follow the pane through a container query, not the window: from 760 all of them, narrower without
    «Who does it», under 520 the phone's line. At 1024 the pane is about 430 wide and nothing spills sideways.
  - «Who does it» stays empty until the team is in.
  - An invite declined, cancelled or run out isn't counted (`teamLookup`, built once).
  - The switch keeps the PATCH's answer in the menu's cache.
  - `AvatarStack` is in `@yeral/ui` (Display/AvatarStack: 3 faces and «+N»).
  - The buffer is written through `fmt.duration`, and «+ N invited» is a plural.
  - Left: the DS `Table` (the rows stay a grid of groups; screen readers get each row's name button and switch). The
    reviewer's «capped at 720 under 1024» doesn't hold: `max-w-text` applies only from 1024 (`md`).
- Next, in their own PRs:
  - the service drawer to add and edit, opened from the row's name and «Add service»;
  - the row's menu, delete with the upcoming-bookings modal or Undo, and groups (add, delete);
  - reordering by the handles with the save bar, and the footer caption about it.
