import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { ClientBooking } from '../model/card'

/** A booking ahead opens where it's handled: a request in Bookings, a confirmed visit in the calendar (B-Client `u.href`). */
export function BookingLink({
  slug,
  booking: b,
  className,
  children,
}: {
  slug: string
  booking: Pick<ClientBooking, 'code' | 'date' | 'status'>
  className?: string
  children: ReactNode
}) {
  return b.status === 'pending' ? (
    <Link to="/w/$slug/bookings" params={{ slug }} search={{ request: b.code }} className={className}>
      {children}
    </Link>
  ) : (
    <Link to="/w/$slug/calendar" params={{ slug }} search={{ booking: b.code, date: b.date }} className={className}>
      {children}
    </Link>
  )
}
