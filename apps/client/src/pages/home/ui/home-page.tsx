import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Check } from 'lucide-react'
import { useRef } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BusinessTile } from '@/entities/business'
import { CategoryIcon } from '@/entities/category'
import { LocationBanner, placeAddress, usePlace, type Place } from '@/features/pick-place'
import { HowWasItCard } from '@/features/write-review'
import { site } from '@/shared/config'
import { wrap } from '@/shared/ui'
import { SearchBar, SearchCard } from '@/widgets/search-bar'

/** How many cards the list shows (Home `.g4`). */
const CARDS = 4
const MOSAIC = 5

const heading = 'm-0 text-[32px] leading-[38px] font-bold tracking-[-0.025em] text-n-900 max-sm:text-[26px] max-sm:leading-[30px]'
const STEPS = ['search', 'pick', 'confirmed'] as const
const REASONS = ['online', 'reminders', 'calendar'] as const

/** The place as the api takes it. */
const nearParams = (place: Place | null) => {
  if (!place) return {}
  return place.kind === 'city' ? { city: place.id } : { lat: place.lat, lng: place.lng }
}

/**
 * Home (book C-02, board Home): the hero with the search card, the «How was it?» card for a visit waiting for its review
 * (F-243), the offer to use the client's location, the places, the categories that take appointments, how it works and the
 * block for businesses. Until the site knows where the client is, the places are the popular ones (C-01).
 */
export function HomePage() {
  const t = useTranslations('home')
  const lang = useLocale()
  const sdk = useSdk()
  const located = usePlace()
  const whereInput = useRef<HTMLInputElement>(null)
  const list = useInfiniteQuery(sdk.catalog.search({ lang, ...nearParams(located.place) })).data?.pages[0]
  const places = list?.items ?? []
  const nearby = list?.located ?? false
  const categories = useQuery(sdk.catalog.categories(lang)).data?.items.filter((c) => c.bookingTypes.includes('appointment')) ?? []
  const photos = places.filter((p) => p.photo).slice(0, MOSAIC)

  return (
    <>
      <section className="pt-16 pb-14 max-sm:pt-8 max-sm:pb-10">
        <div className={`${wrap} flex flex-col items-center gap-0 text-center`}>
          <span className="inline-flex h-7 items-center rounded-pill border border-a-line bg-a-50 px-3 text-dense font-semibold text-a-600">
            {t('kicker')}
          </span>
          <h1 className="m-0 mt-5 text-display text-n-900 max-sm:text-[44px] max-sm:leading-[48px]">{t('title')}</h1>
          <p className="m-0 mt-4 max-w-190 text-body-l text-n-600">{t('lead')}</p>
          <SearchBar located={located} whereInput={whereInput} className="mt-10 max-sm:hidden" />
          <SearchCard located={located} className="mt-8 w-full sm:hidden" />
          {photos.length === MOSAIC && (
            <div className="mt-14 flex w-full max-w-[1040px] gap-4 max-sm:mt-8 max-sm:gap-3 max-sm:overflow-x-auto">
              {photos.map((p) => (
                <Link
                  key={p.slug}
                  to="/$lang/c/$category"
                  params={{ lang, category: p.category.id }}
                  className="relative h-50 flex-1 overflow-hidden rounded-card bg-n-100 focus-visible:shadow-focus focus-visible:outline-none max-sm:h-35 max-sm:min-w-40"
                >
                  <img src={p.photo!.url} alt="" className="size-full object-cover" />
                  <span className="absolute bottom-3 left-3 inline-flex h-7 items-center rounded-pill bg-n-0 px-3 text-dense font-semibold text-n-900">
                    {p.category.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className={wrap}>
        <HowWasItCard className="mb-10" />
        <LocationBanner
          className="mb-10"
          unknown={located.unknown}
          denied={located.denied}
          locating={located.locating}
          onAllow={() => void located.askBrowser()}
          onType={() => whereInput.current?.focus()}
        />
      </div>

      {places.length > 0 && (
        <section className="pb-20">
          <div className={`${wrap} flex flex-col gap-6`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className={heading}>{nearby ? t('nearby') : t('popular')}</h2>
                <span className="text-small text-n-600">{nearby ? t('nearbyCaption') : t('popularCaption')}</span>
              </div>
              <Link
                to="/$lang/search"
                params={{ lang }}
                search={placeAddress(located.place)}
                className="text-small font-semibold text-a-600 no-underline hover:underline"
              >
                {t('seeAll')}
              </Link>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-x-6 gap-y-8">
              {places.slice(0, CARDS).map((card) => (
                <BusinessTile key={card.slug} card={card} />
              ))}
            </div>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="pb-20">
          <div className={`${wrap} flex flex-col gap-6`}>
            <div className="flex flex-col gap-1">
              <h2 className={heading}>{t('categories')}</h2>
              <span className="text-small text-n-600">{t('categoriesCaption')}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(176px,100%),1fr))] gap-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to="/$lang/c/$category"
                  params={{ lang, category: c.id }}
                  className="flex min-h-30 flex-col gap-5 rounded-card border border-n-200 p-4 text-body font-semibold text-n-900 no-underline hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none"
                >
                  <CategoryIcon name={c.icon} />
                  <span className="flex flex-col gap-0.5">
                    {c.name}
                    <span className="text-dense font-normal text-n-600">{c.hint}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-n-200 py-20 max-sm:py-14">
        <div className={`${wrap} flex flex-col gap-8`}>
          <h2 className={heading}>{t('how')}</h2>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-8 p-0">
            {STEPS.map((step, i) => (
              <li key={step} className="flex flex-col gap-2">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-a-50 text-small font-bold text-a-600">
                  {i + 1}
                </span>
                <span className="text-[17px] leading-6 font-semibold text-n-900">{t(`steps.${step}`)}</span>
                <span className="text-small text-n-600">{t(`stepsText.${step}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-group py-20 max-sm:py-14">
        <div className={`${wrap} grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-center gap-12`}>
          <div className="flex flex-col gap-4">
            <span className="text-label text-n-500 uppercase">{t('businessLabel', { brand: t('brandBusiness') })}</span>
            <h2 className={heading}>{t('businessTitle')}</h2>
            <p className="m-0 text-body text-n-600">{t('businessText')}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="primary" size="l">
                <a href={site.urls.business}>{t('businessAction')}</a>
              </Button>
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col gap-5 p-0">
            {REASONS.map((reason) => (
              <li key={reason} className="flex items-start gap-3">
                <Check aria-hidden className="mt-0.5 size-5 flex-none text-a-600" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-body font-semibold text-n-900">{t(`reasons.${reason}`)}</span>
                  <span className="text-dense text-n-600">{t(`reasonsText.${reason}`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
