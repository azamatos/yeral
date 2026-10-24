# Settings → Services, the service drawer (P4 slice 2; feat/settings-service-drawer)

- **The drawer** (`pages/settings-services/ui/service-drawer.tsx`; B-Services `.drw`, design §28.6, book B-38): «New
  service» («Goes to Hair») or «Edit service» («Hair · Hair colouring»). The `Drawer` uses `scrim="auto"`; the focus
  goes back to what opened it.
  - **Name:** up to 60, and «Enter the service name.» on Save. The name and description are written in the reader's
    language, one language at the first release (§28.1); the business's other languages are kept.
  - **Description:** optional, up to 200 with its counter.
  - **Group and Duration:** Duration runs 5 min to 4 h in 5-minute steps, keeping a stored length the list lacks.
  - **Buffer after the service:** «As in Booking rules · 10 min» (null), «No buffer» or 5–30, with the link to Booking
    rules.
  - **Price:** `ChipRadioGroup` with Fixed · From · Free · Price at the place.
    - The amount field is labelled «Price», «Lowest price» or «Amount», figures only, up to 5. Fixed and From need
      one: «Enter the price.».
    - Under it «Clients see: 50 TMT» (or «from … TMT»), and the at-the-place note.
  - **Who does it:** every team row that isn't removed, with the avatar and specialization, tagged «Invited» or
    «Doesn’t use the app». With nobody ticked, «No specialist chosen — clients can’t book this service.». The invited
    note shows when someone invited is ticked.
  - **Online booking:** the switch with its line.
- **Save** adds the service (`addService`, last in its group) or sends only what changed (`updateInput`; the same people
  in another order is no change). The toasts: «New service added: Beard trim», «Hair colouring saved».
- **Opening it:** the row's name, a button whose hit area is the whole row (`.rbtn::after`) with the switch above it.
  The open row is in the tint. «Add service» in the header opens a new one in the first group, and an empty group's «Add
  service» (named «Add service to Spa») opens one there.
- **`@yeral/ui`:** `ChipRadioGroup` (Selection/Chip «RadioChips»).
- **`@yeral/contract/services`:** exports `ServiceInput` and `ServiceUpdate`, the input types.
- Next: the row's menu, delete (the upcoming-bookings modal or Undo) and groups; the drawer's «Delete service» comes
  with them.
