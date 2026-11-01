// FSD layers and imports (`pnpm lint:fsd`, ADR 0004)
import { fsd } from '@yeral/config/steiger'

export default [
  ...fsd,
  // the booking and request drawers open from the calendar alone until the bookings list (slice 4's B8) and the
  // client card (B11) open them too: drop this then. A rule turned off for a slice hides that slice's imports from
  // the rule, so a second consumer must be a real one.
  { files: ['./src/widgets/booking-drawer/**'], rules: { 'fsd/insignificant-slice': 'off' } },
  // «Block time» opens from the day's slot menu alone until the phone's calendar (slice 4's B5) and the week views
  // open it too: drop this then.
  { files: ['./src/features/block-time/**'], rules: { 'fsd/insignificant-slice': 'off' } },
  // move mode lives on the calendar's grid alone: the bookings list reaches it by the address (`?move=`), and the week
  // views (slice 4's B7) move from their day. Drop this if a second page ever draws it.
  { files: ['./src/features/move-booking/**'], rules: { 'fsd/insignificant-slice': 'off' } },
]
