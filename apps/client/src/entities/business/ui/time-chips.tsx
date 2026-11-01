import { Link } from '@tanstack/react-router'
import type { BusinessCard } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { useLocale, useTranslations } from 'use-intl'

/** The card's next times (Search `.slot`, Home): each opens the booking at that time; «+3» says how many more that day. */
export function TimeChips({ card, limit = 4 }: { card: BusinessCard; limit?: number }) {
  const t = useTranslations('businessCard')
  const fmt = useFmt()
  const lang = useLocale()
  const a = card.availability
  if (a.type === 'class' || a.starts.length === 0) return null
  const shown = a.starts.slice(0, limit)
  const more = a.more + a.starts.length - shown.length
  return (
    <div className="relative z-1 flex flex-wrap items-center gap-2">
      {shown.map((start) => (
        <Link
          key={start}
          to="/$lang/b/$slug/book"
          params={{ lang, slug: card.slug }}
          search={{ date: a.date, time: start }}
          aria-label={t('bookAt', { name: card.name, time: fmt.time(start) })}
          className="inline-flex h-8.5 min-w-15 items-center justify-center rounded-input border border-n-300 bg-n-0 px-2.5 text-small font-semibold text-n-900 tabular-nums no-underline hover:border-a-500 hover:text-a-600 focus-visible:shadow-focus focus-visible:outline-none"
        >
          {fmt.time(start)}
        </Link>
      ))}
      {more > 0 && <span className="text-dense text-n-600">{t('more', { n: more })}</span>}
    </div>
  )
}
