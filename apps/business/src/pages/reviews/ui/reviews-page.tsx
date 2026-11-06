import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { REVIEW_SORTS, type TeamReview } from '@yeral/contract/reviews'
import type { Workspace } from '@yeral/contract/team'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { cn } from '@yeral/ui/cn'
import { EmptyState } from '@yeral/ui/empty-state'
import { pillVariants } from '@yeral/ui/pill'
import { Stars } from '@yeral/ui/rating'
import { RatingDistribution } from '@yeral/ui/rating-distribution'
import { Select } from '@yeral/ui/select'
import { Spinner } from '@yeral/ui/spinner'
import { toast } from '@yeral/ui/toast'
import { Check, CheckCheck, Eye, ExternalLink, Info, MessageSquare, Reply, SearchX, Star } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { pageLink } from '@/shared/config/site'
import { useErrorText } from '@/shared/i18n'
import { useWorkspace, WorkspacePage } from '@/widgets/workspace-shell'
import type { ReviewsSearch, ReviewStars } from '../model/search'
import { ReportReviewModal } from './report-review-modal'
import { ReviewItem } from './review-item'

/** The specialist filter's «All specialists» row (the Select has no empty value). */
const ALL = 'all'

const STAR_CHIPS: readonly ReviewStars[] = [5, 4, 3, 2, 1]
const LINK =
  'inline-flex items-center gap-1.5 rounded-sm text-small font-semibold text-a-600 no-underline hover:underline focus-visible:shadow-focus focus-visible:outline-none'

/**
 * The reviews (B-Reviews, book B-53, B-54): the rating summary as clients see it, the chips and the specialist in the
 * address, the reviews with their replies, the reply composer, reporting a review to Ýeral, pages of 20. The owner and
 * administrators reply and report; a specialist reads the reviews about their own visits, without the summary.
 */
export function ReviewsPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return <Reviews key={workspace.slug} workspace={workspace} />
}

function Reviews({ workspace }: { workspace: Workspace }) {
  const t = useTranslations('reviews')
  const sections = useTranslations('shell.sections')
  const brand = useTranslations('common')('brand')
  const fmt = useFmt()
  const locale = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const navigate = useNavigate()
  const search: ReviewsSearch = useSearch({ strict: false })
  const [reporting, setReporting] = useState<TeamReview | null>(null)
  const { slug } = workspace
  // the api lets the owner and administrators reply and report (`reviewsReply: all`); a specialist only reads
  const manage = workspace.level !== 'specialist'
  // a specialist's address keeps neither «not answered» (no chip) nor a specialist (the api refuses another's)
  const unanswered = manage && search.filter === 'unanswered'
  const staffId = manage ? search.staff : undefined
  // a chip or the specialist changes the address, not the scroll
  const go = (patch: Partial<ReviewsSearch>) =>
    void navigate({ to: '.', search: (prev: ReviewsSearch) => ({ ...prev, ...patch }), replace: true, resetScroll: false })

  const list = useInfiniteQuery({
    ...sdk.reviews.list(slug, {
      unanswered: unanswered ? true : undefined,
      stars: search.stars,
      staff: staffId,
      sort: search.order,
      lang: locale,
    }),
    placeholderData: keepPreviousData,
  })
  const team = useQuery({ ...sdk.team.list(slug), enabled: manage })
  const rows = list.data?.pages.flatMap((p) => p.items) ?? []
  const first = list.data?.pages[0]
  const summary = first?.summary ?? null
  const total = first?.total
  const filtered = !!(unanswered || search.stars || staffId)
  const clear = () => go({ filter: undefined, stars: undefined, staff: undefined })

  if (list.isError && !list.data) throw list.error

  const more = () =>
    void list.fetchNextPage().then((r) => {
      if (r.isError) toast(errorText(r.error))
    })

  const chip = search.stars ? String(search.stars) : unanswered ? 'unanswered' : 'all'
  const pickChip = (value: string) => {
    if (value === 'all') go({ filter: undefined, stars: undefined })
    else if (value === 'unanswered') go({ filter: 'unanswered', stars: undefined })
    else go({ filter: undefined, stars: Number(value) as ReviewStars })
  }
  const chips = [
    { value: 'all', label: t('filter.all') },
    ...(manage ? [{ value: 'unanswered', label: t('filter.unanswered') }] : []),
    ...STAR_CHIPS.map((n) => ({
      value: String(n),
      label: (
        <>
          <span aria-hidden>{n}</span>
          <Star aria-hidden className="size-3.5 fill-current" />
          <span className="sr-only">{t('filter.stars', { count: n })}</span>
        </>
      ),
    })),
  ]
  // whoever had a visit may be a review's specialist: the whole team still here
  const staff = team.data?.items.filter((m) => m.status !== 'removed') ?? []

  const page = pageLink(slug)
  const seePage = (label: string) => (
    <a href={page.url} target="_blank" rel="noreferrer" className={LINK}>
      {label}
      <ExternalLink aria-hidden className="size-4" />
    </a>
  )
  // a reported review Ýeral is checking shows in the list but not in the summary's count
  const uncounted = summary && !filtered && total !== undefined ? total - summary.count : 0

  const empty = () => {
    if (unanswered && !search.stars && !staffId)
      return (
        <EmptyState
          bordered
          icon={<CheckCheck aria-hidden />}
          title={t('empty.answeredTitle')}
          description={t('empty.answeredText')}
          action={
            <Button variant="secondary" size="s" onClick={clear}>
              {t('empty.showAll')}
            </Button>
          }
        />
      )
    if (filtered)
      return (
        <EmptyState
          bordered
          icon={<SearchX aria-hidden />}
          title={t('empty.noMatchTitle')}
          description={manage ? t('empty.noMatchText') : t('empty.noMatchTextOwn')}
          action={
            <Button variant="secondary" size="s" onClick={clear}>
              {t('empty.clear')}
            </Button>
          }
        />
      )
    return (
      <EmptyState
        bordered
        icon={<MessageSquare aria-hidden />}
        title={manage ? t('empty.title') : t('empty.aboutYouTitle')}
        description={manage ? t('empty.text') : t('empty.aboutYouText')}
        action={manage ? seePage(t('empty.seePage')) : undefined}
      />
    )
  }

  return (
    <WorkspacePage title={sections('reviews')}>
      <div className="flex max-w-[920px] flex-col gap-5">
        {summary && summary.count > 0 && (
          <section
            aria-label={t('summary.label')}
            className="grid grid-cols-1 items-center border-b border-n-200 pb-6 md:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_auto]"
          >
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-end gap-3.5">
                <span className="text-[48px] leading-none font-bold tracking-[-0.035em] text-n-900">{fmt.rating(summary.rating ?? 0)}</span>
                <span className="flex flex-col gap-1 pb-0.5">
                  <Stars rating={summary.rating ?? 0} label={t('summary.average', { rating: fmt.rating(summary.rating ?? 0) })} />
                  <span className="text-dense text-n-600">{t('summary.count', { count: summary.count })}</span>
                </span>
              </div>
              {uncounted > 0 && (
                <span className="max-w-[220px] text-dense text-n-600">{t('summary.uncounted', { count: uncounted, brand })}</span>
              )}
            </div>
            <RatingDistribution
              className="mt-4 border-t border-n-200 pt-4 md:mt-0 md:border-t-0 md:border-l md:py-1 md:pt-0 md:pl-8"
              rows={STAR_CHIPS.map((stars) => ({
                stars,
                count: summary.breakdown[stars],
                label: t('summary.row', { stars, count: summary.breakdown[stars] }),
              }))}
            />
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-n-200 pt-4 xl:mt-0 xl:max-w-70 xl:flex-col xl:items-start xl:gap-2.5 xl:border-t-0 xl:border-l xl:py-1 xl:pt-0 xl:pl-8">
              {summary.unanswered > 0 ? (
                <button
                  type="button"
                  onClick={() => go({ filter: 'unanswered', stars: undefined })}
                  className={cn(
                    pillVariants({ tone: 'warning', size: 'l' }),
                    'cursor-pointer hover:border-st-pending-ink focus-visible:shadow-focus focus-visible:outline-none',
                  )}
                >
                  <Reply aria-hidden />
                  {t('summary.unanswered', { count: summary.unanswered })}
                </button>
              ) : (
                <span className={pillVariants({ tone: 'success', size: 'l' })}>
                  <Check aria-hidden strokeWidth={2} />
                  {t('summary.allAnswered')}
                </span>
              )}
              {seePage(t('summary.seePage'))}
            </div>
          </section>
        )}
        {!manage && (
          <p className="m-0 flex max-w-[680px] items-start gap-2.5 text-body text-n-600">
            <Eye aria-hidden className="mt-0.5 size-4.5 flex-none" />
            <span>{t('specialistIntro')}</span>
          </p>
        )}
        {(rows.length > 0 || filtered) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <ChipRadioGroup aria-label={t('filter.label')} value={chip} onValueChange={pickChip} options={chips} />
              {manage && (
                <Select
                  size="m"
                  aria-label={t('filter.staff')}
                  value={search.staff ?? ALL}
                  onValueChange={(v) => go({ staff: v === ALL ? undefined : v })}
                  options={[{ value: ALL, label: t('filter.allStaff') }, ...staff.map((m) => ({ value: m.id, label: m.name }))]}
                  className="max-sm:w-full"
                />
              )}
            </div>
            <Select
              size="m"
              aria-label={t('sort.label')}
              value={search.order ?? 'newest'}
              onValueChange={(v) => go({ order: v === 'newest' ? undefined : (v as ReviewsSearch['order']) })}
              options={REVIEW_SORTS.map((s) => ({ value: s, label: t(`sort.${s}`) }))}
              className="max-sm:w-full"
            />
          </div>
        )}
        {list.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner label={t('loading')} />
          </div>
        ) : rows.length === 0 ? (
          empty()
        ) : (
          <section
            aria-label={manage ? t('list') : t('listAboutYou')}
            className={cn(
              'flex flex-col border-t border-n-200',
              // the old rows dim while a changed filter loads; a refresh after a reply or a report changes nothing visible
              list.isPlaceholderData && 'opacity-60',
            )}
          >
            {rows.map((r) => (
              <ReviewItem key={r.id} slug={slug} business={workspace.name} review={r} manage={manage} onReport={() => setReporting(r)} />
            ))}
          </section>
        )}
        {list.hasNextPage && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" loading={list.isFetchingNextPage} onClick={more}>
              {t('showMore')}
            </Button>
            {manage && total !== undefined && <span className="text-dense text-n-600">{t('showing', { shown: rows.length, total })}</span>}
          </div>
        )}
        {manage && rows.length > 0 && (
          <div className="flex items-start gap-2 text-n-600">
            <Info aria-hidden className="mt-px size-4 flex-none" />
            <span className="text-dense">{t('footnote')}</span>
          </div>
        )}
      </div>
      {reporting && <ReportReviewModal slug={slug} review={reporting} onClose={() => setReporting(null)} />}
    </WorkspacePage>
  )
}
