import { Link } from '@tanstack/react-router'
import type { BusinessCard } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { useLocale, useTranslations } from 'use-intl'

/**
 * A time on a card (C7-Home `TimeSlots`): S 32 / r 8 / 13 on 16, M 40 / r 10 / 14 on 20 under 768; white with an n-300
 * line, n-50 with an n-400 line on hover; the figures proportional (A1).
 */
const slot =
  'inline-flex h-8 min-w-15 items-center justify-center gap-1 rounded-ctl-s border border-n-300 bg-n-0 px-3 text-ctl-s/4 font-semibold text-n-900 no-underline hover:border-n-400 hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none max-sm:h-10 max-sm:min-w-17 max-sm:rounded-ctl-m max-sm:px-3.5 max-sm:text-ctl-m/5'

/**
 * The card's next times (C7-Home `TimeSlots`; Search, Home): up to three chips, each opening the booking at that time,
 * then «+N» (Tertiary) opening the booking on that day with every time. For a search over several days (`from` is the
 * day searched) the first chip of a later day carries the muted day («Thu 10:15»).
 */
export function TimeChips({ card, limit = 3, from, className }: { card: BusinessCard; limit?: number; from?: string; className?: string }) {
  const t = useTranslations('businessCard')
  const fmt = useFmt()
  const lang = useLocale()
  const a = card.availability
  if (a.type === 'class' || a.starts.length === 0) return null
  const shown = a.starts.slice(0, limit)
  const more = a.more + a.starts.length - shown.length
  const day = from !== undefined && a.date !== from ? fmt.weekdayAbbr(a.date) : undefined
  return (
    <div className={cn('relative z-1 flex flex-wrap items-center gap-2', className)}>
      {shown.map((start, i) => {
        const time = fmt.time(start)
        const prefix = i === 0 ? day : undefined
        return (
          <Link
            key={start}
            to="/$lang/b/$slug/book"
            params={{ lang, slug: card.slug }}
            search={{ date: a.date, time: start }}
            aria-label={prefix ? t('bookOn', { name: card.name, day: prefix, time }) : t('bookAt', { name: card.name, time })}
            className={slot}
          >
            {prefix && <span className="text-n-500">{prefix}</span>}
            {prefix && ' '}
            {time}
          </Link>
        )
      })}
      {more > 0 && (
        <Button asChild variant="tertiary" size="s" className="min-w-13 max-sm:h-10 max-sm:rounded-ctl-m max-sm:px-4 max-sm:text-ctl-m/5">
          <Link
            to="/$lang/b/$slug/book"
            params={{ lang, slug: card.slug }}
            search={{ date: a.date, step: 'time' }}
            aria-label={t('moreTimes', { n: more })}
          >
            {t('more', { n: more })}
          </Link>
        </Button>
      )}
    </div>
  )
}
