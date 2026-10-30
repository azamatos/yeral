// FSD layers and imports (`pnpm lint:fsd`, ADR 0004)
import { fsd } from '@yeral/config/steiger'

export default [
  ...fsd,
  // the review form and the «How was it?» card (F-243) open from My bookings alone (its rows, the drawer and the card
  // over the list, one slice) until the home page mounts the card too (P4 slice 5): drop this then. A rule turned off
  // for a slice hides that slice's imports from the rule, so a second consumer must be a real one.
  { files: ['./src/features/write-review/**'], rules: { 'fsd/insignificant-slice': 'off' } },
]
