import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BookingDetail, BookingSummary } from '@yeral/contract/bookings'
import { REVIEW_TAGS, REVIEW_TEXT_MAX, reviewEditableUntil } from '@yeral/domain/lifecycle'
import { reviewName } from '@yeral/domain/names'
import { localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { keys } from '@yeral/sdk'
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
import { whatParts } from '@/entities/booking'
import { useErrorText } from '@/shared/i18n'
import { calendarAt } from '@/shared/lib'
import { changed, initialForm, refused, reviewBody, toggleTag, type WrittenReview } from '../model/review-form'

/** The booking the review is about, as My bookings' rows and the booking drawer have it. */
export type ReviewedBooking = Pick<BookingSummary, 'code' | 'business' | 'what' | 'date' | 'start'>

export interface ReviewModalProps {
  booking: ReviewedBooking
  /**
   * The review written already (`BookingDetail.review`): the form changes it (book C-35). None: a new one (C-34).
   * Read when the modal opens: open «Edit» once the booking's detail (and its review) is there.
   */
  review?: WrittenReview | null
  /** Stars already pressed («How was it?», F-243): picked when the form opens. */
  rating?: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** After it's sent: the modal has closed and said thanks; the booking as the api answers it now. */
  onDone?: (booking: BookingDetail) => void
  /**
   * Where the focus goes back to on closing, when the element that opened it is gone by then (the «How was it?»
   * card's stars, a menu's row); without it, back to whatever had the focus when it opened.
   */
  returnFocus?: RefObject<HTMLElement | null>
}

/**
 * The review modal (Account-Bookings `view=review`, book C-34, C-35; 560, a bottom sheet under 768): the business and
 * the visit, «How was it?» with the stars (required, their word beside them), «What went well?» chips, the words (up
 * to 500, optional) and the name a new one shows under, «Later» and «Send review». Opened on a written review, it
 * changes it («Save changes», until its 7 days are up). Sent, it thanks with a toast and closes (it can't be closed
 * while it sends); the sdk updates the booking, the lists and the business's reviews. Refused by the api (the visit
 * reviewed or changed meanwhile, its days over), it closes with the reason in a toast and the booking, the lists and
 * the «How was it?» card are read again, so the screen says what the booking is now (as move mode and the drawer do);
 * a failure that may pass (the network) stays in the modal with what was written. The caller opens it (Write a
 * review, the card's stars, Edit) and keeps `open`.
 */
export function ReviewModal({ open, onOpenChange, returnFocus, onDone, ...form }: ReviewModalProps) {
  const t = useTranslations('review')
  const lang = useLocale()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  // here, not in the form: a send finishes (its toast, `onDone`) whatever the form does meanwhile
  const write = useMutation(sdk.bookings.review(lang))
  const edit = useMutation(sdk.bookings.editReview(lang))
  const busy = write.isPending || edit.isPending
  // opened by the caller (no trigger of its own): the focus goes back where it was, or where the caller says
  const opener = useRef<HTMLElement | null>(null)
  const send = (written: boolean, body: { rating: number; tags: string[]; text?: string }) => {
    const mutation = written ? edit : write
    mutation.mutate(
      { code: form.booking.code, body },
      {
        onSuccess: (detail) => {
          toast(written ? t('changed') : t('sent'))
          onOpenChange(false)
          onDone?.(detail)
        },
        onError: (error) => {
          if (!refused(error)) return
          // the booking moved on meanwhile: what it is now decides what the row, the drawer and the card offer
          for (const queryKey of [sdk.bookings.detail(form.booking.code, lang).queryKey, keys.bookingLists(), keys.howWasItAll()])
            void queryClient.invalidateQueries({ queryKey })
          toast(errorText(error))
          onOpenChange(false)
        },
      },
    )
  }
  return (
    <Modal open={open} onOpenChange={(next) => (next || !busy) && onOpenChange(next)}>
      {/* the form starts afresh at every opening: it lives in the content, which closes with the modal */}
      <ModalContent
        size={560}
        aria-describedby={undefined}
        onOpenAutoFocus={() => {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          // a new opening starts without the last one's refusal
          write.reset()
          edit.reset()
        }}
        onCloseAutoFocus={(e) => {
          const to = returnFocus?.current?.isConnected ? returnFocus.current : opener.current
          if (!to?.isConnected) return
          e.preventDefault()
          to.focus()
        }}
      >
        <ReviewForm {...form} busy={busy} error={write.error ?? edit.error} onSend={send} />
      </ModalContent>
    </Modal>
  )
}

function ReviewForm({
  booking: b,
  review,
  rating = null,
  busy,
  error,
  onSend,
}: Pick<ReviewModalProps, 'booking' | 'review' | 'rating'> & {
  busy: boolean
  error: Error | null
  onSend: (written: boolean, body: { rating: number; tags: string[]; text?: string }) => void
}) {
  const t = useTranslations('review')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const me = useQuery(sdk.me.get())
  // what it opened on stays for this opening: a review written meanwhile (this one, settling) doesn't turn it into an
  // edit, and one that arrives late doesn't fill an emptied form
  const [written] = useState(() => review ?? null)
  const [form, setForm] = useState(() => initialForm(written, rating))
  const tagsId = useId()
  const body = reviewBody(form)
  const ready = body !== null && (!written || changed(form, written))
  const visit = [...whatParts(b.what), fmt.shortWeekdayDate(calendarAt(b.date, b.start).date)].filter(Boolean).join(' · ')
  const name = me.data?.firstName ? reviewName({ first: me.data.firstName, surname: me.data.surname }) : null
  const until = written && localOf(reviewEditableUntil(written.createdAt))

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
          required
          className="mt-1"
        />
      </ModalHeader>
      <div className="flex flex-col gap-2.5">
        <span id={tagsId} className="text-dense font-semibold text-n-900">
          {t('tags')}
        </span>
        <div role="group" aria-labelledby={tagsId} className="flex flex-wrap gap-2">
          {REVIEW_TAGS.map((tag) => (
            <Chip key={tag} selected={form.tags.includes(tag)} onClick={() => setForm((f) => ({ ...f, tags: toggleTag(f.tags, tag) }))}>
              {t(`tag.${tag}`)}
            </Chip>
          ))}
        </div>
      </div>
      <Field
        label={t('text')}
        optional={t('optional')}
        // a new review shows under the account's name (a written one keeps the name it was signed with)
        hint={written ? undefined : name ? t('shownAs', { name }) : t('shownAsAny')}
        counter={{
          value: form.text.length,
          max: REVIEW_TEXT_MAX,
          text: t('counter', { count: form.text.length, max: REVIEW_TEXT_MAX }),
        }}
      >
        <Textarea
          value={form.text}
          placeholder={t('placeholder')}
          // cut at the limit, as the board does
          maxLength={REVIEW_TEXT_MAX}
          className="h-26"
          onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
        />
      </Field>
      {until && (
        <span className="text-dense text-n-600">{t('until', { date: fmt.shortWeekdayDate(until.date), time: fmt.time(until.min) })}</span>
      )}
      {error && (
        <Callout tone="danger" size="s" live>
          {errorText(error)}
        </Callout>
      )}
      <ModalActions>
        <ModalClose asChild>
          <Button variant="ghost" disabled={busy}>
            {written ? t('cancel') : t('later')}
          </Button>
        </ModalClose>
        <Button
          variant="primary"
          disabled={!ready}
          loading={busy}
          loadingText={t('sending')}
          onClick={() => body && ready && !busy && onSend(!!written, body)}
        >
          {written ? t('save') : t('send')}
        </Button>
      </ModalActions>
    </>
  )
}
