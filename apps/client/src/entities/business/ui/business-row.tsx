import { Link } from '@tanstack/react-router'
import type { BusinessCard } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Rating } from '@yeral/ui/rating'
import { useLocale, useTranslations } from 'use-intl'
import { useCardLine } from './business-meta'
import { TimeChips } from './time-chips'

/**
 * A result (Search `.rr`): the photo, the name with its rating, category · street · distance, the price from, the next
 * times. The name's link covers the row; the time chips sit above it.
 */
export function BusinessRow({ card }: { card: BusinessCard }) {
  const t = useTranslations('businessCard')
  const fmt = useFmt()
  const lang = useLocale()
  const line = useCardLine()
  return (
    <article className="relative -mx-3 grid grid-cols-[200px_minmax(0,1fr)] gap-5 rounded-l p-3 hover:bg-n-50 max-sm:grid-cols-[112px_minmax(0,1fr)] max-sm:gap-3.5">
      {card.photo ? (
        <img src={card.photo.url} alt="" loading="lazy" className="h-37.5 w-50 rounded-m bg-n-100 object-cover max-sm:size-28" />
      ) : (
        <span aria-hidden className="h-37.5 w-50 rounded-m bg-n-100 max-sm:size-28" />
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="m-0 min-w-0 text-[17px] leading-6 font-semibold text-n-900">
            <Link
              to="/$lang/b/$slug"
              params={{ lang, slug: card.slug }}
              className="text-n-900 no-underline after:absolute after:inset-0 after:rounded-l hover:underline focus-visible:outline-none focus-visible:after:shadow-focus"
            >
              {card.name}
            </Link>
          </h2>
          {card.rating !== null && <Rating value={fmt.rating(card.rating)} count={card.reviewsCount} className="flex-none" />}
        </div>
        <span className="text-dense text-n-600">{line(card)}</span>
        <div className="flex flex-wrap items-center gap-2 text-small text-n-900">
          {card.priceFrom && (
            <span>{card.priceFrom.type === 'fixed' ? t('from', { price: fmt.price(card.priceFrom) }) : fmt.price(card.priceFrom)}</span>
          )}
        </div>
        <TimeChips card={card} />
      </div>
    </article>
  )
}
