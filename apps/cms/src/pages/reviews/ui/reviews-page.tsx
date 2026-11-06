import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ADMIN_REVIEW_VIEWS, type AdminReview } from '@yeral/contract/admin'
import type { AdminReviewView } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { EmptyState } from '@yeral/ui/empty-state'
import { Pill } from '@yeral/ui/pill'
import { Quote } from '@yeral/ui/quote'
import { Skeleton } from '@yeral/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@yeral/ui/tabs'
import { toast } from '@yeral/ui/toast'
import { MessageSquareWarning } from 'lucide-react'
import { useState } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { ReasonModal } from '@/shared/ui'
import { TeamPage } from '@/widgets/team-shell'

const STAMP = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const

/**
 * `/reviews` (book F-180, Q-261, Q-262): reported reviews, the longest waiting first. A reported review stops counting
 * at once and counts again after 48 hours if nobody decides. Keeping one ends it (it can't be reported again); removing
 * one takes it out of every count. Only the business hears the result.
 */
export function ReviewsPage({ view = 'reported' }: { view?: AdminReviewView }) {
  const t = useTranslations('reviews')
  const sdk = useSdk()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const list = useQuery(sdk.admin.reviews(view))
  return (
    <TeamPage title={t('title')}>
      <Tabs
        value={view}
        onValueChange={(next) => void navigate({ to: '/reviews', search: next === 'reported' ? {} : { view: next as AdminReviewView } })}
      >
        <TabsList aria-label={t('views.label')}>
          {ADMIN_REVIEW_VIEWS.map((v) => (
            <TabsTrigger key={v} value={v}>
              {t(`views.${v}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={view} className="flex flex-col gap-4 pt-4">
          {list.error ? (
            <EmptyState icon={<MessageSquareWarning />} title={errorText(list.error)} />
          ) : !list.data ? (
            <Skeleton className="h-56" />
          ) : list.data.items.length === 0 ? (
            <EmptyState icon={<MessageSquareWarning />} title={t(`empty.${view}`)} />
          ) : (
            list.data.items.map((review) => <ReviewCard key={review.id} review={review} />)
          )}
        </TabsContent>
      </Tabs>
    </TeamPage>
  )
}

function ReviewCard({ review }: { review: AdminReview }) {
  const t = useTranslations('reviews')
  const format = useFormatter()
  const { report } = review
  const waiting = report && !review.clearedAt && !review.removed
  return (
    <article className="flex max-w-180 flex-col gap-3 rounded-ctl-l border border-n-200 p-4">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-body font-semibold text-n-900">{review.business.name}</h2>
        <span className="text-dense text-n-600">{t('about', { what: review.what })}</span>
      </header>
      <div className="flex flex-wrap items-center gap-2 text-small text-n-900">
        <b className="font-semibold">{review.author}</b>
        <span>{t('rating', { rating: review.rating })}</span>
        {review.tags.map((tag) => (
          <Pill key={tag}>{t.has(`tags.${tag}` as 'tags.clean') ? t(`tags.${tag}` as 'tags.clean') : tag}</Pill>
        ))}
      </div>
      {review.text && <Quote>{review.text}</Quote>}
      {review.reply && <p className="text-small text-n-600">{t('reply', { reply: review.reply })}</p>}
      {report && (
        <div className="flex flex-col gap-1 text-small text-n-900">
          <b className="font-semibold">{t(`reasons.${report.reason}`)}</b>
          {report.text && <span>{report.text}</span>}
          <span className="text-dense text-n-600">
            {report.by
              ? t('reportedBy', { when: format.dateTime(report.at, STAMP), by: report.by })
              : t('reportedByNobody', { when: format.dateTime(report.at, STAMP) })}
          </span>
        </div>
      )}
      {waiting && (
        <Callout tone={report.counted ? 'warning' : 'neutral'} size="s">
          {report.counted ? t('countedAgain') : t('countsAgain', { when: format.dateTime(report.countsAgainAt, STAMP) })}
        </Callout>
      )}
      {review.clearedAt && <p className="text-dense text-n-600">{t('clearedOn', { when: format.dateTime(review.clearedAt, STAMP) })}</p>}
      {review.removed && (
        <p className="text-dense text-n-600">
          {t('removedBecause', { when: format.dateTime(review.removed.at, STAMP), reason: review.removed.reason })}
        </p>
      )}
      {waiting && <Decide id={review.id} />}
    </article>
  )
}

function Decide({ id }: { id: string }) {
  const t = useTranslations('reviews')
  const sdk = useSdk()
  const errorText = useErrorText()
  const clear = useMutation(sdk.admin.clearReview())
  const remove = useMutation(sdk.admin.removeReview())
  const [removing, setRemoving] = useState(false)
  const failed = (error: unknown) => void toast(errorText(error))
  return (
    <div className="flex gap-2">
      <Button
        size="s"
        loading={clear.isPending}
        onClick={() => clear.mutate(id, { onSuccess: () => void toast(t('kept')), onError: failed })}
      >
        {t('keep')}
      </Button>
      <Button size="s" variant="danger-quiet" onClick={() => setRemoving(true)}>
        {t('remove')}
      </Button>
      {removing && (
        <ReasonModal
          title={t('removeTitle')}
          lead={t('removeLead')}
          hint={t('reasonHint')}
          action={t('remove')}
          pending={remove.isPending}
          onConfirm={(reason) =>
            remove.mutate(
              { id, reason },
              {
                onSuccess: () => {
                  toast(t('removed'))
                  setRemoving(false)
                },
                onError: failed,
              },
            )
          }
          onClose={() => setRemoving(false)}
        />
      )}
    </div>
  )
}
