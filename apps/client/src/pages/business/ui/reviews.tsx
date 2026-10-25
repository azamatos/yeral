import { useInfiniteQuery } from '@tanstack/react-query'
import type { BusinessDetail, reviewSchema } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { Quote } from '@yeral/ui/quote'
import { Stars } from '@yeral/ui/rating'
import { RatingDistribution } from '@yeral/ui/rating-distribution'
import { Info } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import type { z } from 'zod'
import { ago } from '../model/ago'
import { Section } from './sections'

type Review = z.infer<typeof reviewSchema>

/**
 * Venue «Teswirler» (book C-07): the average, the count and the 5-to-1 bars beside the reviews, newest first, a page
 * at a time («All reviews» loads more, as C-07 says, until there are no more; how many show is said), and who may
 * write one. A review the business reported and Ýeral is
 * checking is listed with its grey line, and counts in none of the numbers (the api leaves it out of them).
 */
export function Reviews({ detail }: { detail: BusinessDetail }) {
  const t = useTranslations('business.reviewList')
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const list = useInfiniteQuery(sdk.catalog.reviews(detail.slug, lang))
  // the pages go by offset: one written meanwhile pushes the last of a page onto the next, so it comes twice
  const seen = new Set<string>()
  const reviews = (list.data?.pages.flatMap((p) => p.items) ?? []).filter((r) => !seen.has(r.id) && !!seen.add(r.id))
  // one clock for every card: «2 days ago» moves once a day
  const now = useClock()
  const counted = detail.rating !== null && detail.reviewsCount > 0
  const footer = (
    <div className="flex flex-wrap items-center gap-4 pt-6">
      {list.isError && <span className="w-full text-small text-danger-ink">{t('failed')}</span>}
      {/* what «All reviews» brought, said: the button stays where it was */}
      <span aria-live="polite" className="sr-only">
        {list.data && list.data.pages.length > 1 ? t('shown', { count: reviews.length }) : ''}
      </span>
      {list.hasNextPage && (
        <Button variant="secondary" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
          {t('more')}
        </Button>
      )}
      <span className="text-dense text-n-600">{t('who')}</span>
    </div>
  )
  return (
    <Section id="reviews" title={t('title')}>
      {!counted && reviews.length === 0 ? (
        <div className="flex flex-col gap-1">
          <p className="m-0 text-body text-n-900">{t('none')}</p>
          <span className="text-dense text-n-600">{t('who')}</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
          {counted && (
            <RatingDistribution
              className="min-w-0 flex-[1_1_220px] pt-5"
              average={{
                score: fmt.rating(detail.rating ?? 0),
                rating: detail.rating ?? 0,
                label: t('average', { rating: fmt.rating(detail.rating ?? 0) }),
                count: t('count', { count: detail.reviewsCount }),
              }}
              rows={([5, 4, 3, 2, 1] as const).map((stars) => ({
                stars,
                count: detail.ratingBreakdown[stars],
                label: t('row', { stars, count: detail.ratingBreakdown[stars] }),
              }))}
            />
          )}
          <div className="flex min-w-0 flex-[999_1_380px] flex-col">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} business={detail.name} now={now} />
            ))}
            {footer}
          </div>
        </div>
      )}
    </Section>
  )
}

/**
 * One review (COMPONENTS ReviewCard): avatar 40 with the name and how long ago, the stars (14) with what it was for,
 * Ýeral's line while it checks a reported one, the words, and the business's reply in its box.
 */
function ReviewCard({ review: r, business, now }: { review: Review; business: string; now: number }) {
  const t = useTranslations('business.reviewList')
  const brand = useTranslations('common')('brand')
  const when = ago(r.createdAt, now)
  return (
    <article className="flex flex-col gap-2.5 border-b border-n-200 py-5">
      <div className="flex items-center gap-3">
        <Avatar name={r.author} size={40} tone="neutral" decorative className="text-[15px] text-n-900" />
        <div className="flex min-w-0 flex-col">
          <span className="text-body font-semibold text-n-900">{r.author}</span>
          <span className="text-dense text-n-600">{t(`when.${when.unit}`, { count: when.count })}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Stars rating={r.rating} size={14} label={t('stars', { rating: r.rating })} />
        {r.what && <span className="text-dense text-n-600">{r.what}</span>}
      </div>
      {r.underReview && (
        <span className="flex items-center gap-1.5 text-dense text-n-600">
          <Info aria-hidden className="size-3.5 flex-none" strokeWidth={1.75} />
          {t('checking', { brand })}
        </span>
      )}
      {r.text && <p className="m-0 text-body text-pretty text-n-900">{r.text}</p>}
      {r.reply && <Quote meta={<span className="font-semibold text-n-900">{t('reply', { name: business })}</span>}>{r.reply.text}</Quote>}
    </article>
  )
}
