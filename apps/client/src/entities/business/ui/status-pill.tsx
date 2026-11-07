import { nowMin, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { useClock } from '@yeral/ui/clock'
import { cn } from '@yeral/ui/cn'
import { Pill } from '@yeral/ui/pill'
import { useTranslations } from 'use-intl'
import { openLine, type OpenState } from '../model/open-line'

/** The last hour before closing turns the pill amber (DS · Lists A7 `ClosesSoon`). */
const CLOSES_SOON_MIN = 60

/**
 * Whether it's open now (A7 `StatusPill`): green «Open until 20:00», amber «Closes at 20:00» in the last hour, grey
 * «Closed · opens tomorrow at 10:00»; it never wraps. On the business page's cover and in About, and on every result
 * row (C7-Home `VenueResultRow`); the hours themselves are in About only (the owner's #19). The minute is the business's
 * own (`@yeral/domain/time`, the market's zone), from the page's shared clock.
 */
export function StatusPill({ open, className }: { open: OpenState; className?: string }) {
  const t = useTranslations('business')
  const fmt = useFmt()
  const now = useClock()
  if (open.open) {
    // `until` is a minute of the business day, past 1440 when it runs past midnight
    const left = (((open.until - nowMin(now)) % 1440) + 1440) % 1440
    const soon = left <= CLOSES_SOON_MIN
    return (
      <Pill
        tone={soon ? 'warning' : 'success'}
        icon={<i aria-hidden className={cn('size-1.5 rounded-pill', soon ? 'bg-st-pending-dot' : 'bg-st-completed-dot')} />}
        className={cn('gap-1.5 pr-2.5', className)}
      >
        {t(soon ? 'statusClosesSoon' : 'statusOpen', { time: fmt.time(open.until) })}
      </Pill>
    )
  }
  const line = openLine(open, today(now), fmt, t)
  return (
    <Pill
      tone="slate"
      icon={<i aria-hidden className="size-1.5 rounded-pill bg-st-cancelled-dot" />}
      className={cn('gap-1.5 pr-2.5', className)}
    >
      {line.text}
    </Pill>
  )
}
