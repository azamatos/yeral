// FSD layers and imports (`pnpm lint:fsd`, ADR 0004)
import { fsd } from '@yeral/config/steiger'

export default [
  ...fsd,
  // «Block time» opens from the day's slot menu alone until the phone's calendar (slice 4's B5) and the week views
  // open it too: drop this then.
  { files: ['./src/features/block-time/**'], rules: { 'fsd/insignificant-slice': 'off' } },
  // the new booking opens from the calendar alone until the phone's sheet (slice 4's B6) and the client card (B11) open
  // it too: drop this then.
  { files: ['./src/features/create-booking/**'], rules: { 'fsd/insignificant-slice': 'off' } },
  // move mode lives on the calendar's grid alone: the bookings list reaches it by the address (`?move=`), and the week
  // views (slice 4's B7) move from their day. Drop this if a second page ever draws it.
  { files: ['./src/features/move-booking/**'], rules: { 'fsd/insignificant-slice': 'off' } },
]
