// FSD layers and imports (`pnpm lint:fsd`, ADR 0004)
import { fsd } from '@yeral/config/steiger'

export default [
  ...fsd,
  // the booking and request drawers open from the calendar alone until the bookings list (slice 4's B8) and the
  // client card (B11) open them too: drop this then. A rule turned off for a slice hides that slice's imports from
  // the rule, so a second consumer must be a real one.
  { files: ['./src/widgets/booking-drawer/**'], rules: { 'fsd/insignificant-slice': 'off' } },
]
