import { useMutation } from '@tanstack/react-query'
import type { TeamReview } from '@yeral/contract/reviews'
import { REVIEW_REPORT_TEXT_MAX } from '@yeral/domain/lifecycle'
import { REVIEW_REPORT_REASONS, type ReviewReportReason } from '@yeral/domain/model'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Radio } from '@yeral/ui/checkbox'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { Quote } from '@yeral/ui/quote'
import { Stars } from '@yeral/ui/rating'
import { toast } from '@yeral/ui/toast'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { useWhen } from './review-item'

/**
 * «Report the review» (B-Reviews → ReportReviewModal, book B-54): the review quoted, the reason, an explanation (needed
 * with «Another reason»), the 48-hour caption; once per review. A sheet on phones.
 */
export function ReportReviewModal({ slug, review: r, onClose }: { slug: string; review: TeamReview; onClose: () => void }) {
  const t = useTranslations('reviews')
  const brand = useTranslations('common')('brand')
  const sdk = useSdk()
  const errorText = useErrorText()
  const when = useWhen()
  const legendId = useId()
  const name = useId()
  const [reason, setReason] = useState<ReviewReportReason | null>(null)
  const [text, setText] = useState('')
  const report = useMutation(sdk.reviews.report(slug))
  const explanation = text.trim()
  const ready = !!reason && (reason !== 'other' || explanation.length > 0) && explanation.length <= REVIEW_REPORT_TEXT_MAX

  const send = () => {
    if (!reason) return
    report.mutate(
      { id: r.id, reason, ...(explanation ? { text: explanation } : {}) },
      {
        onSuccess: () => {
          toast(t('toast.reported', { brand }))
          onClose()
        },
        onError: (error) => {
          toast(errorText(error))
          // someone reported it meanwhile: the list (refreshed by the sdk) says so now
          if (isApiError(error, 'already_reported')) onClose()
        },
      },
    )
  }

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent size={480} className="gap-4">
        <ModalHeader title={t('report.title')} closeLabel={t('report.close')} />
        <Quote
          meta={
            <>
              <span className="font-semibold text-n-900">{r.author}</span>
              <Stars rating={r.rating} size={14} label={t('stars', { rating: r.rating })} />
              <span className="text-n-600">{when(r.createdAt)}</span>
              <span className="basis-full text-n-600">{r.what}</span>
            </>
          }
        >
          {r.text}
        </Quote>
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" aria-labelledby={legendId}>
          <legend id={legendId} className="mb-2 p-0 text-small font-semibold text-n-900">
            {t('report.why')}
          </legend>
          {REVIEW_REPORT_REASONS.map((value) => (
            <Radio
              key={value}
              name={name}
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
              label={t(`reasons.${value}`)}
            />
          ))}
        </fieldset>
        <Field
          label={reason === 'other' ? t('report.explanation') : t('report.explanationOptional')}
          counter={{
            value: explanation.length,
            max: REVIEW_REPORT_TEXT_MAX,
            text: t('report.counter', { count: explanation.length, max: REVIEW_REPORT_TEXT_MAX }),
          }}
        >
          <Textarea
            maxLength={REVIEW_REPORT_TEXT_MAX}
            placeholder={t('report.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <ModalDescription className="text-dense text-n-600">{t('report.caption', { brand })}</ModalDescription>
        <ModalActions>
          <Button variant="secondary" onClick={onClose}>
            {t('report.cancel')}
          </Button>
          <Button variant="primary" disabled={!ready} loading={report.isPending} onClick={send}>
            {t('report.send')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
