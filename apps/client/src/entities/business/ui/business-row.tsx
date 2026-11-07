import { Link } from '@tanstack/react-router'
import type { BusinessCard } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { cn } from '@yeral/ui/cn'
import { Rating } from '@yeral/ui/rating'
import { useLocale, useTranslations } from 'use-intl'
import { useCardLine } from './business-meta'
import { StatusPill } from './status-pill'
import { TimeChips } from './time-chips'

/**
 * A result (C7-Home `VenueResultRow`): the photo 200 × 150, the name 18/24 with its rating, «Category · 3.0 km», whether
 * it's open, the price from, the next three times and «+N». The name's link covers the row; the times sit above it. Under
 * 768 the photo is 88 square beside the text and the times run under both. The searched service with its price (the
 * board's service line) waits for the api to say which service matched; the price from stands in its place.
 */
export function BusinessRow({ card, from, className }: { card: BusinessCard; from?: string; className?: string }) {
  const t = useTranslations('businessCard')
  const fmt = useFmt()
  const lang = useLocale()
  const line = useCardLine()
  return (
    <article
      className={cn('relative flex flex-col gap-2.5 py-4 sm:grid sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-x-5 sm:gap-y-3', className)}
    >
      <div className="flex gap-3 sm:contents">
        {card.photo ? (
          <img
            src={card.photo.url}
            alt=""
            loading="lazy"
            className="size-22 flex-none rounded-ctl-l bg-n-100 object-cover sm:h-37.5 sm:w-50"
          />
        ) : (
          <span aria-hidden className="size-22 flex-none rounded-ctl-l bg-n-100 sm:h-37.5 sm:w-50" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-1.5">
          <div className="flex items-baseline justify-between gap-2 sm:gap-3">
            <h2 className="m-0 min-w-0 truncate text-[16px] leading-[22px] font-semibold text-n-900 sm:text-[18px] sm:leading-6">
              <Link
                to="/$lang/b/$slug"
                params={{ lang, slug: card.slug }}
                className="text-n-900 no-underline after:absolute after:inset-0 after:rounded-card hover:underline focus-visible:outline-none focus-visible:after:shadow-focus"
              >
                {card.name}
              </Link>
            </h2>
            {card.rating !== null && <Rating value={fmt.rating(card.rating)} count={card.reviewsCount} className="flex-none" />}
          </div>
          <span className="text-small text-n-600">{line(card)}</span>
          <StatusPill open={card.open} className="self-start max-sm:mt-0.5" />
          {card.priceFrom && (
            <span className="text-small text-n-900">
              {card.priceFrom.type === 'fixed' ? t('from', { price: fmt.price(card.priceFrom) }) : fmt.price(card.priceFrom)}
            </span>
          )}
        </div>
      </div>
      <TimeChips card={card} from={from} className="sm:col-start-2" />
    </article>
  )
}
