// FSD layers and imports (`pnpm lint:fsd`, ADR 0004)
import { fsd } from '@yeral/config/steiger'

export default [
  ...fsd,
  // the wizard's rules step uses it now; Settings → Booking rules, its second user, comes next (P4 slice 2): drop
  // this with that page
  { files: ['./src/features/edit-booking-rules/**'], rules: { 'fsd/insignificant-slice': 'off' } },
]
