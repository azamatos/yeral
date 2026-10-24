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
- Next, in their own PRs:
  - the service drawer to add and edit, opened from the row's name and «Add service»;
  - the row's menu, delete with the upcoming-bookings modal or Undo, and groups (add, delete);
  - reordering by the handles with the save bar, and the footer caption about it.
