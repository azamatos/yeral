import type { BookingsAffectedDetails } from '@yeral/contract/errors'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { StatusBadge } from '@yeral/ui/status-badge'
import { Check, Clock } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'

export type AffectedBooking = BookingsAffectedDetails['bookings'][number]

const JOIN = { dot: 'joinDot', list: 'joinList', plus: 'joinPlus' } as const

/** Words joined as the language joins them: «a · b · c» (`dot`), «a, b» (`list`) or a booking's services «a + b» (`plus`). */
export function useJoin() {
  const t = useTranslations('affected')
  return (parts: readonly string[], how: keyof typeof JOIN) => parts.filter(Boolean).reduce((a, b) => (a ? t(JOIN[how], { a, b }) : b), '')
}

/** «5 bookings and 1 request» (`and`) or «5 bookings · 1 request» (the list's label). */
export function useAffectedCount() {
  const t = useTranslations('affected')
  return ({ bookings, requests }: BookingsAffectedDetails['counts'], join: 'and' | 'dot') => {
    const a = bookings ? t('bookings', { n: bookings }) : ''
    const b = requests ? t('requests', { n: requests }) : ''
    return a && b ? t(join === 'and' ? 'joinAnd' : 'joinDot', { a, b }) : a || b
  }
}

/**
 * The bookings a change leaves out (DS-Business AffectedBookingsList, B-Settings and B-Team `.abl`): a row each,
 * «Today · 18:00–18:45» over «client · service · specialist», Confirmed, or Pending with the time left to answer;
 * `outcome` adds a line under a row (B-Team's remove: who takes it, or what happens to it). The timer moves to
 * TimerPill with the calendar.
 */
export function AffectedBookingsList({
  bookings,
  labelledBy,
  outcome,
}: {
  bookings: readonly AffectedBooking[]
  labelledBy: string
  outcome?: (booking: AffectedBooking) => ReactNode
}) {
  const t = useTranslations('affected')
  const s = useTranslations('status')
  const fmt = useFmt()
  const join = useJoin()
  const [now] = useState(() => Date.now())
  // today and tomorrow by name, any other day «Fri, 16 Oct» (yesterday's business day too, still ahead past midnight)
  const day = (date: string) => fmt.relativeShortDate(date, today(now))
  return (
    <div role="list" aria-labelledby={labelledBy} className="flex flex-col border-t border-n-200">
      {bookings.map((b) => {
        // a hold already over (not expired yet by the jobs) shows no time
        const left = b.holdUntil !== null && b.holdUntil > now ? fmt.duration(Math.ceil((b.holdUntil - now) / 60_000)) : null
        const who = join(
          [
            b.client ?? t('unnamed'),
            join(
              b.items.map((i) => i.service),
              'list',
            ),
            join(b.staff, 'list'),
          ],
          'dot',
        )
        return (
          <div
            key={b.code}
            role="listitem"
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-n-200 py-2.5 text-small"
          >
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold tabular-nums">{t('when', { day: day(b.date), time: fmt.timeRange(b.start, b.end) })}</span>
              <span className="text-dense text-n-600">{who}</span>
            </span>
            <span className="flex flex-wrap items-center justify-end gap-1.5">
              {b.status === 'confirmed' ? (
                <StatusBadge status="confirmed" icon={<Check strokeWidth={2} />}>
                  {s('confirmed')}
                </StatusBadge>
              ) : (
                <>
                  <StatusBadge status="pending" icon={<Clock strokeWidth={2} />}>
                    {s('pending')}
                  </StatusBadge>
                  {left && (
                    <span
                      role="timer"
                      aria-label={t('left', { time: left })}
                      title={t('left', { time: left })}
                      className="inline-flex h-6 items-center gap-1 rounded-pill border border-st-pending-line bg-st-pending-bg px-2 text-micro font-semibold whitespace-nowrap text-st-pending-ink tabular-nums [&_svg]:size-3"
                    >
                      <Clock aria-hidden strokeWidth={2} />
                      {left}
                    </span>
                  )}
                </>
              )}
            </span>
            {outcome?.(b)}
          </div>
        )
      })}
    </div>
  )
}
