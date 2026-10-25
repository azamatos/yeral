import { Link } from '@tanstack/react-router'
import type { BusinessCard } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { ExampleBadge } from '@yeral/ui/example-badge'
import { Rating } from '@yeral/ui/rating'
import { useLocale, useTranslations } from 'use-intl'
import { wrap } from '@/shared/ui'

/**
 * Venue «Golaýdaky ýerler» (book C-06 step 6): up to four places of the same kind nearest to this one, across the page
 * under a line (64 above, 80 below), as many in a row as fit at 260. «See all» comes with the search (slice 5).
 */
export function Nearby({ places }: { places: readonly BusinessCard[] }) {
  const t = useTranslations('business.nearby')
  if (places.length === 0) return null
  return (
    <section aria-labelledby="nearby-title" className="border-t border-n-200 pt-16 pb-20 max-sm:pt-12 max-sm:pb-16">
      <div className={`${wrap} flex flex-col gap-7`}>
        <h2 id="nearby-title" className="m-0 text-[26px] leading-8 font-bold tracking-[-0.02em] max-sm:text-[22px] max-sm:leading-7">
          {t('title')}
        </h2>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-x-6 gap-y-8 p-0">
          {places.map((p) => (
            <li key={p.slug}>
              <PlaceCard place={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/**
 * A place (COMPONENTS VenueCard, Venue `.vc`): the photo 4 / 3 r12, the name 17/22 600 (underlined on hover) with
 * «Example», «category · distance», the rating and its count, today's first free times and the lowest price. The whole
 * card is the link to its page.
 */
function PlaceCard({ place: p }: { place: BusinessCard }) {
  const t = useTranslations('business')
  const fmt = useFmt()
  const lang = useLocale()
  const times = p.availability.type === 'appointment' || p.availability.type === 'table' ? p.availability.starts.slice(0, 3) : []
  return (
    <Link
      to="/$lang/b/$slug"
      params={{ lang, slug: p.slug }}
      className="group flex flex-col gap-3 rounded-m text-n-900 no-underline focus-visible:shadow-focus focus-visible:outline-none"
    >
      {p.photo ? (
        <img
          src={p.photo.url}
          alt=""
          loading="lazy"
          className="block aspect-4/3 w-full rounded-m object-cover transition-[filter] group-hover:brightness-94"
        />
      ) : (
        <span aria-hidden className="block aspect-4/3 w-full rounded-m bg-n-100" />
      )}
      <span className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="inline-flex flex-wrap items-center gap-2 text-[17px] leading-[22px] font-semibold group-hover:underline">
            {p.name}
            {p.example && (
              <>
                <span className="sr-only">, </span>
                <ExampleBadge>{t('example')}</ExampleBadge>
              </>
            )}
          </span>
          <span className="text-dense text-n-600">
            {p.distanceM !== null ? `${p.category.name} · ${fmt.distance(p.distanceM)}` : p.category.name}
          </span>
        </span>
        {p.rating !== null && p.reviewsCount > 0 && (
          <Rating value={fmt.rating(p.rating)} count={fmt.number(p.reviewsCount)} className="flex-none text-small [&_svg]:size-3.5" />
        )}
      </span>
      {(times.length > 0 || p.priceFrom) && (
        <span className="flex flex-wrap items-center gap-1.5">
          {times.map((start) => (
            <span
              key={start}
              className="inline-flex h-8 items-center justify-center rounded-input border border-n-300 bg-n-0 px-2.5 text-dense font-semibold tabular-nums"
            >
              {fmt.time(start)}
            </span>
          ))}
          {p.priceFrom && <span className="ml-1 text-dense text-n-600">{fmt.price(p.priceFrom)}</span>}
        </span>
      )}
    </Link>
  )
}
