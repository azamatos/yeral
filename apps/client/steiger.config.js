// FSD layers and imports (`pnpm lint:fsd`, ADR 0004)
import { fsd } from '@yeral/config/steiger'

export default [
  ...fsd,
  // the review form waits for My bookings and the booking drawer to open it (P4 slice 3, C5, C6): drop this once
  // they import it
  { files: ['./src/features/write-review/**'], rules: { 'fsd/insignificant-slice': 'off' } },
]
