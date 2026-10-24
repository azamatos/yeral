import type { BookingStatus } from '@yeral/domain/model'
import { INTERNAL_STATUS_COLORS, type INTERNAL_STATUS_ICONS } from '@yeral/domain/model'
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Flag,
  Hourglass,
  MessageSquare,
  Play,
  Sparkles,
  Star,
  UserCheck,
  UserX,
  X,
  type LucideIcon,
} from 'lucide-react'

/** Each booking status's one icon, the same in the calendar, the lists and the client's booking (B-Settings `.stl`). */
export const BOOKING_STATUS_ICON: Record<BookingStatus, LucideIcon> = {
  pending: Clock,
  confirmed: Check,
  completed: CheckCheck,
  cancelled: X,
  noshow: UserX,
}

/** An internal status's icon by its key (`INTERNAL_STATUS_ICONS`), in the picker's order. */
export const INTERNAL_STATUS_ICON: Record<(typeof INTERNAL_STATUS_ICONS)[number], LucideIcon> = {
  'user-check': UserCheck,
  play: Play,
  hourglass: Hourglass,
  flag: Flag,
  star: Star,
  bell: Bell,
  message: MessageSquare,
  sparkles: Sparkles,
}

/** The colours' names in the messages (`settings.statuses.colours.*`), in `INTERNAL_STATUS_COLORS`' order. */
export const COLOUR_KEY = {
  [INTERNAL_STATUS_COLORS[0]]: 'violet',
  [INTERNAL_STATUS_COLORS[1]]: 'green',
  [INTERNAL_STATUS_COLORS[2]]: 'brown',
  [INTERNAL_STATUS_COLORS[3]]: 'red',
  [INTERNAL_STATUS_COLORS[4]]: 'grey',
  [INTERNAL_STATUS_COLORS[5]]: 'black',
} as const satisfies Record<(typeof INTERNAL_STATUS_COLORS)[number], string>
