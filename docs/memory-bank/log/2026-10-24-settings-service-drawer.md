# Settings → Services, the service drawer, delete and groups (P4 slice 2; feat/settings-service-drawer-2)

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
- **Delete a service** (`useDeleteService`, `pages/settings-services/ui/delete-service.tsx`; B-Services `askDelete`,
  design §28.6, book Q-210):
  - With upcoming bookings it asks first: «Delete Hair colouring?», «It has 4 upcoming bookings. They stay as they are;
    new bookings can’t choose it.», then Cancel or Delete service. After it, the toast reads «Hair colouring deleted ·
    its 4 upcoming bookings stay as they are».
  - Without upcoming bookings it goes at once, with «Undo» in the toast (`restoreService`, «Manicure is back»).
  - Two places start it: the row's menu and the drawer's «Delete service».
- **The row's menu** («Manicure: actions», the 40 column): Edit (opens the drawer), Hide from / Open for online
  booking, Delete service.
- **Groups:**
  - «Add group» in the header opens the name box («New group name», Enter or «Add group», Escape or Cancel). The group
    goes to the end of the list: «Group added: Beard».
  - Each group's menu («Hair group: actions») has «Add a service here» and «Delete group». The delete waits («Move or
    delete its services first») while the group has services; an empty group deletes at once («Group deleted: Spa»).
- Not here: reordering by the handles with its save bar and the footer caption about it.
- Review (one round, `code-review` high), 13 of 15 fixed:
  - A name or description keeps only the market's languages: a starter service's tk and ru would make the api refuse
    the rename.
  - An emptied description goes in every language; one over 200 blocks Save («Too long»).
  - Each delete and each Undo answers on its own (`mutateAsync`), and the drawer's save toasts even if it closed.
  - The drawer stays open while a save is on its way.
  - A service or group deleted beside an open drawer closes it.
  - The focus returns from the confirm, and from Add group.
  - A second Enter adds no second group.
  - The currency comes from `MARKET`.
  - «Who does it» says when the team didn't load.
  - `ChipRadioGroup` takes all four arrows.
  - `PRICE_KEY` is gone.
- Left from the review:
  - Deleting an empty group while a service's Undo from it is still showing makes that Undo fail. The api
    hard-deletes the group's archived services.
  - The service-name limit and the price digits are copied in `pages/setup/model/services.ts`. They move to
    `@yeral/domain/services` when the wizard's services step meets the drawer.
