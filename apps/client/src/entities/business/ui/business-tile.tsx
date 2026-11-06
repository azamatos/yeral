import { Link } from '@tanstack/react-router'
import type { BusinessCard } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Rating } from '@yeral/ui/rating'
import { useLocale } from 'use-intl'
import { useCardLine } from './business-meta'
import { TimeChips } from './time-chips'

/** A card on Home (`.vc`): the photo, the name, category · street, the rating, the next three times. */
export function BusinessTile({ card }: { card: BusinessCard }) {
  const fmt = useFmt()
  const lang = useLocale()
  const line = useCardLine()
  return (
    <article className="group relative flex min-w-0 flex-col gap-3">
      {card.photo ? (
        <img
          src={card.photo.url}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-full rounded-m bg-n-100 object-cover transition-[filter] group-hover:brightness-95"
        />
      ) : (
        <span aria-hidden className="aspect-[4/3] w-full rounded-m bg-n-100" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="m-0 text-[17px] leading-6 font-semibold text-n-900">
            <Link
              to="/$lang/b/$slug"
              params={{ lang, slug: card.slug }}
              className="text-n-900 no-underline group-hover:underline after:absolute after:inset-0 after:rounded-m focus-visible:outline-none focus-visible:after:shadow-focus"
            >
              {card.name}
            </Link>
          </h3>
          <span className="text-dense text-n-600">{line(card)}</span>
        </div>
        {card.rating !== null && <Rating value={fmt.rating(card.rating)} count={card.reviewsCount} className="flex-none" />}
      </div>
      <TimeChips card={card} limit={3} />
    </article>
  )
}
