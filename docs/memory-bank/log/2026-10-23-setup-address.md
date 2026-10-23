# 2026-10-23 · The setup wizard's address step (P4 slice 2)

- `@yeral/ui` (#159): **MapFrame** (`map-frame`): MapLibre GL (`maplibre-gl` ^6.15 in the catalog) with OpenFreeMap's
  `positron` style, loaded lazily with its worker file given to it (`setWorkerUrl` from a `?url` import); the drawn
  ground with tokens until the tiles load, or where WebGL or tiles aren't there; `MapPinHandle` (the draggable pin, or
  `area` for the home-based circle; arrow keys 8 px, Shift 32), `MapMarker`, `MapPin` (`asChild` for a pin to pick),
  `MapDot`, the zoom buttons above the veil, `overlay` for «Pick the address first». The pins are placed by Web
  Mercator math (`projection.ts`), so they work over the ground and the tiles alike. `MapTiles` sets the tiles' style;
  Storybook's preview sets `null`, so story tests stay offline (`WithTiles` is `!test`). **Combobox** (`combobox`):
  `Combobox` + `ComboboxInput` (in a `Field`) + `ComboboxList` in the flow under it (the screens draw it there, so it
  isn't a popover); the active row is kept by option id; Esc closes the list before a dialog around it hears it.
- The business app: `pages/setup/ui/address-step.tsx` (B-Onboarding `isAddr`, book B-03): the city select, the
  address search (`sdk.settings.addressSearch` after a 300 ms pause, from 3 letters; nothing found or
  `address_search_unavailable` → the typed street, pinned by hand), the pin, «I work from home» (the circle, the note),
  the floor and the entrance note with counters; Continue saves through `settings.updateProfile` (`location`, `floor`,
  `entranceNote`, `hideExactAddress`), moves the draft to `hours` and opens it. `model/address.ts` holds the form's
  rules (unit-tested). Each step now gives the wizard its content and a `StepAction` (valid, hint, busy, ready, save,
  reopens; `setup-frame.tsx`); the address step is a hook (`useAddressStep(slug, on)`), so `Steps` renders one
  `SetupFrame` around every step (no remount between steps). Continue, Back, the step list and «Continue later» call
  `save` first; Continue then moves the draft to the next step with the one `setup.step` mutation. A step built next
  adds a hook like it and one branch in `Steps`. `useDebounced` in the business app's `shared/lib`.
- Choices made: chapter 9, 23.10.2026, B-03 (how).
- Next: the hours step (TimeRangeField, #158), then services, team, rules, done; Settings → Business profile reuses
  MapFrame and the address search (the form's rules can move to a feature then).
