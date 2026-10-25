import type { BookingStatus } from '@yeral/domain/model'
import { StatusBadge } from '@yeral/ui/status-badge'
import { Check, CheckCheck, Clock, UserX, X, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'use-intl'

/** Each status's one icon (DS «Five statuses with one meaning everywhere»: clock · check · check-check · x · user-x). */
const ICON: Record<BookingStatus, LucideIcon> = { pending: Clock, confirmed: Check, completed: CheckCheck, cancelled: X, noshow: UserX }

/** A booking's status as the client sees it: the badge with its icon and the shared word (Pending, Confirmed …). */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations('status')
  const Icon = ICON[status]
  return (
    <StatusBadge status={status} icon={<Icon aria-hidden className="size-3.5" strokeWidth={2} />}>
      {t(status)}
    </StatusBadge>
  )
}
