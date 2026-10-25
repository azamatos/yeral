import { useMutation, useQuery } from '@tanstack/react-query'
import type { BookingDetail, BookingSummary } from '@yeral/contract/bookings'
import { REVIEW_TAGS, REVIEW_TEXT_MAX } from '@yeral/domain/lifecycle'
import { reviewName } from '@yeral/domain/names'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Chip } from '@yeral/ui/chip'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { Modal, ModalActions, ModalClose, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { RatingInput } from '@yeral/ui/rating'
import { toast } from '@yeral/ui/toast'
import { useId, useRef, useState, type RefObject } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useErrorText } from '@/shared/i18n'
import { calendarAt } from '@/shared/lib'
import { changed, editableUntil, initialForm, reviewBody, toggleTag, tooLong, type WrittenReview } from '../model/review-form'

/** The booking the review is about, as My bookings' rows and the booking drawer have it. */
export type ReviewedBooking = Pick<BookingSummary, 'code' | 'business' | 'what' | 'date' | 'start'>

export interface ReviewModalProps {
  booking: ReviewedBooking
  /** The review written already (`BookingDetail.review`): the form changes it (book C-35). None: a new one (C-34). */
  review?: WrittenReview | null
  /** Stars already pressed («How was it?», F-243): picked when the form opens. */
  rating?: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** After it's sent: the modal has closed and said thanks; the booking as the api answers it now. */
  onDone?: (booking: BookingDetail) => void
  /**
   * Where the focus goes back to on closing, when the element that opened it is gone by then (a menu's row); without
   * it, back to whatever had the focus when it opened.
   */
  returnFocus?: RefObject<HTMLElement | null>
}

/**
 * The review modal (Account-Bookings `view=review`, book C-34, C-35; 560, a bottom sheet under 768): the business and
 * the visit, «How was it?» with the stars (required, their word beside them), «What went well?» chips, the words (up
 * to 500, optional) and the name it will show under, «Later» and «Send review». Opened on a written review, it
 * changes it («Save changes», until its 7 days are up). Sent, it thanks with a toast and closes; the sdk updates the
 * booking, the lists and the business's reviews. The caller opens it (Write a review, the card's stars, Edit) and
 * keeps `open`.
 */
export function ReviewModal({ open, onOpenChange, returnFocus, ...form }: ReviewModalProps) {
  // opened by the caller (no trigger of its own): the focus goes back where it was, or where the caller says
  const opener = useRef<HTMLElement | null>(null)
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {/* the form starts afresh at every opening: it lives in the content, which closes with the modal */}
      <ModalContent
        size={560}
        onOpenAutoFocus={() => {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={(e) => {
          const to = returnFocus?.current?.isConnected ? returnFocus.current : opener.current
          if (!to?.isConnected) return
          e.preventDefault()
          to.focus()
        }}
      >
        <ReviewForm {...form} onClose={() => onOpenChange(false)} />
      </ModalContent>
    </Modal>
  )
}

function ReviewForm({
  booking: b,
  review: written = null,
  rating = null,
  onDone,
  onClose,
}: Omit<ReviewModalProps, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const t = useTranslations('review')
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const me = useQuery(sdk.me.get())
  const [form, setForm] = useState(() => initialForm(written, rating))
  const send = useMutation(written ? sdk.bookings.editReview(lang) : sdk.bookings.review(lang))
  const tagsId = useId()
  const body = reviewBody(form)
  const ready = body !== null && (!written || changed(form, written))
  const items = b.what.type === 'appointment' ? b.what.items : []
  const staff = [...new Set(items.map((i) => i.staff).filter((s): s is string => Boolean(s)))]
  const visit = [items.map((i) => i.service).join(', '), ...staff, fmt.shortWeekdayDate(calendarAt(b.date, b.start).date)]
    .filter(Boolean)
    .join(' · ')
  const name = me.data?.firstName ? reviewName({ first: me.data.firstName, surname: me.data.surname }) : null
  const length = form.text.trim().length

  const submit = () => {
    if (!body || !ready || send.isPending) return
    send.mutate(
      { code: b.code, body },
      {
        onSuccess: (detail) => {
          toast(written ? t('changed') : t('sent'))
          onClose()
          onDone?.(detail)
        },
      },
    )
  }

  return (
    <>
      <ModalHeader
        title={t('title')}
        closeLabel={t('close')}
        media={
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {b.business.photo ? (
              <img src={b.business.photo.url} alt="" className="size-12 flex-none rounded-s object-cover" />
            ) : (
              <Avatar name={b.business.name} size={48} shape="square" tone="neutral" decorative />
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-body font-semibold text-n-900">{b.business.name}</span>
              <span className="text-dense text-n-600">{visit}</span>
            </span>
          </div>
        }
      >
        <RatingInput
          value={form.rating}
          onValueChange={(stars) => setForm((f) => ({ ...f, rating: stars }))}
          label={t('rating')}
          starLabel={(count) => t('star', { count })}
          words={[t('words.1'), t('words.2'), t('words.3'), t('words.4'), t('words.5')]}
          placeholder={t('pick')}
          className="mt-1"
        />
      </ModalHeader>
      <div className="flex flex-col gap-2.5">
        <span id={tagsId} className="text-dense font-semibold text-n-900">
          {t('tags')}
        </span>
        <div role="group" aria-labelledby={tagsId} className="flex flex-wrap gap-2">
          {REVIEW_TAGS.map((tag) => (
            <Chip
              key={tag}
              selected={form.tags.includes(tag)}
              aria-pressed={form.tags.includes(tag)}
              onClick={() => setForm((f) => ({ ...f, tags: toggleTag(f.tags, tag) }))}
            >
              {t(`tag.${tag}`)}
            </Chip>
          ))}
        </div>
      </div>
      <Field
        label={t('text')}
        optional={t('optional')}
        error={tooLong(form) && t('tooLong', { max: REVIEW_TEXT_MAX })}
        hint={name ? t('shownAs', { name }) : t('shownAsAny')}
        counter={{ value: length, max: REVIEW_TEXT_MAX, text: t('counter', { count: length, max: REVIEW_TEXT_MAX }) }}
      >
        <Textarea
          value={form.text}
          placeholder={t('placeholder')}
          // twice the limit can be typed, so the counter and the error show what's too long
          maxLength={REVIEW_TEXT_MAX * 2}
          className="h-26"
          onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
        />
      </Field>
      {written && (
        <span className="text-dense text-n-600">{t('until', { date: fmt.shortWeekdayDate(today(editableUntil(written))) })}</span>
      )}
      {send.isError && (
        <Callout tone="danger" size="s" live>
          {errorText(send.error)}
        </Callout>
      )}
      <ModalActions>
        <ModalClose asChild>
          <Button variant="ghost">{written ? t('cancel') : t('later')}</Button>
        </ModalClose>
        <Button variant="primary" disabled={!ready} loading={send.isPending} loadingText={t('sending')} onClick={submit}>
          {written ? t('save') : t('send')}
        </Button>
      </ModalActions>
    </>
  )
}
