// FSD layers and imports (`pnpm lint:fsd`, ADR 0004)
import { fsd } from '@yeral/config/steiger'

export default [
  ...fsd,
  // the review form opens from My bookings (its rows and the drawer, one slice); the «How was it?» card (F-243, the
  // home page and My bookings) makes the second: drop this then
  { files: ['./src/features/write-review/**'], rules: { 'fsd/insignificant-slice': 'off' } },
]
