import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Check } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { BusinessTile } from '@/entities/business'
import { HowWasItCard } from '@/features/write-review'
import { site } from '@/shared/config'
import { wrap } from '@/shared/ui'
import { CategoryIcon } from './category-icon'
import { SearchCard } from './search-card'

/** How many cards the list shows (Home `.g4`). */
const CARDS = 4
const MOSAIC = 5

const heading = 'm-0 text-[32px] leading-[38px] font-bold tracking-[-0.025em] text-n-900 max-sm:text-[26px] max-sm:leading-[30px]'
const STEPS = ['search', 'pick', 'confirmed'] as const
const REASONS = ['online', 'reminders', 'calendar'] as const

/**
 * Home (book C-02, board Home): the hero with the search card, the «How was it?» card for a visit waiting for its review
 * (F-243), the places, the categories that take appointments, how it works and the block for businesses. Until the
 * visitor shares where they are (slice 5's D4) the places are the popular ones.
 */
export function HomePage() {
  const t = useTranslations('home')
  const lang = useLocale()
  const sdk = useSdk()
  const places = useInfiniteQuery(sdk.catalog.search({ lang })).data?.pages[0]?.items ?? []
  const categories = useQuery(sdk.catalog.categories(lang)).data?.items.filter((c) => c.bookingTypes.includes('appointment')) ?? []
  const photos = places.filter((p) => p.photo).slice(0, MOSAIC)

  return (
    <>
      <section className="pt-14 pb-22 max-sm:pt-8 max-sm:pb-14">
        <div className={`${wrap} grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-center gap-14`}>
          <div className="flex min-w-0 flex-col gap-5">
            <span className="text-small font-semibold text-a-600">{t('kicker')}</span>
            <h1 className="m-0 text-[80px] leading-[80px] font-bold tracking-[-0.045em] text-n-900 max-sm:text-[48px] max-sm:leading-[50px]">
              {t('title')}
            </h1>
            <p className="m-0 max-w-120 text-body-l text-n-600">{t('lead')}</p>
            <SearchCard />
          </div>
          {photos.length === MOSAIC && (
            <div className="grid grid-cols-[1.15fr_1fr] grid-rows-[200px_200px_180px] gap-3 max-sm:grid-rows-[140px_140px_120px]">
              {photos.map((p, i) => (
                <Link
                  key={p.slug}
                  to="/$lang/c/$category"
                  params={{ lang, category: p.category.id }}
                  className={`relative overflow-hidden rounded-l focus-visible:shadow-focus focus-visible:outline-none ${i === 0 ? 'row-span-2' : ''}`}
                >
                  <img src={p.photo!.url} alt="" className="size-full object-cover" />
                  <span className="absolute bottom-3 left-3 inline-flex h-7.5 items-center rounded-full bg-n-0 px-3 text-dense font-semibold text-n-900">
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
      </div>

      {places.length > 0 && (
        <section className="pb-20">
          <div className={`${wrap} flex flex-col gap-6`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className={heading}>{t('popular')}</h2>
                <span className="text-small text-n-600">{t('popularCaption')}</span>
              </div>
              <Link to="/$lang/search" params={{ lang }} className="text-small font-semibold text-a-600 no-underline hover:underline">
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
                  className="flex min-h-30 flex-col gap-5 rounded-l border border-n-200 p-4 text-body font-semibold text-n-900 no-underline hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none"
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
            <div>
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
