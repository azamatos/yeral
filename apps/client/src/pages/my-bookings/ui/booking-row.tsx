import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { MyBooking } from '@yeral/contract/bookings'
import { useFmt } from '@yeral/i18n'
import { telHref } from '@yeral/lib/links'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Price } from '@yeral/ui/price'
import { Rating } from '@yeral/ui/rating'
import { toast } from '@yeral/ui/toast'
import { Building2, CalendarDays, CircleAlert, Clock, Hourglass, Phone, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BookingStatusBadge, useUndoFailed, whatParts } from '@/entities/booking'
import { OfferTimes, useVisitLine, useWhen } from './offer-times'

/**
 * The part of an action's name read but not seen (`<hidden>` in `callLabel`, `undoLabel`…): the word shown stays the
 * start of the accessible name in every language (axe: label-content-name-mismatch).
 */
const hidden = (chunks: ReactNode) => <span className="sr-only">{chunks}</span>

/** A line under the status (`.bby`): a 14 icon and a 13/18 caption. */
export function ByLine({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-dense text-n-600 [&_svg]:size-3.5 [&_svg]:flex-none">
      {icon}
      {children}
    </span>
  )
}

/** «You rated ★ 5» in the row's footer and the drawer (Account-Bookings `.rated`; the star a-500), heard as «You rated it 5 out of 5». */
export function YouRated({ rating }: { rating: number }) {
  const t = useTranslations('myBookings')
  return (
    <span
      role="img"
      aria-label={t('ratedLabel', { rating })}
      className="inline-flex items-center gap-1.5 self-start text-small leading-[18px] font-semibold text-n-900"
    >
      {t('rated')} <Rating value={rating} className="gap-1 [&_svg]:size-4" />
    </span>
  )
}

/** The row's link, where the focus goes back to when its booking's drawer closes. */
export const rowLinkId = (code: string) => `booking-${code}`

/** Who cancelled, in the row's and the drawer's words, with its icon; null while it isn't cancelled. */
export function useCancelledBy() {
  const t = useTranslations('myBookings')
  return (b: Pick<MyBooking, 'cancelledBy' | 'decline'>) =>
    b.cancelledBy === 'client'
      ? { text: t('byClient'), icon: <UserRound aria-hidden /> }
      : b.cancelledBy === 'system'
        ? { text: t('bySystem'), icon: <Hourglass aria-hidden /> }
        : b.cancelledBy === 'business'
          ? { text: b.decline ? t('declined') : t('byBusiness'), icon: <Building2 aria-hidden /> }
          : null
}

/**
 * A row of My bookings (book C-23–C-31, C-40), a bordered card since 07.11 (the owner found Account-Bookings' `.brow`
 * scattered): the business's photo 64 (the Mobile board's) beside its name with the status on the right (opening the
 * booking in the drawer: the whole card answers to it), then «what · who · price», then when (a phone icon for a
 * booking the business made by phone; the time struck through while offered times stand in for it), what the status
 * means now (waiting for the business, who cancelled, a no-show, a waiting move) and the reason of a decline or the
 * business's cancel. A footer under a line carries «You rated ★ 5» once reviewed on the left and what can be done now
 * on the right: Call while it's ahead (and for a client booked by phone only), Undo after the client's own cancel (its
 * failure said in the card), Write a review after a visit (`features/write-review`), Edit the review while it may
 * change (7 days, as the drawer), Book again; on phones the footer stacks and the actions take the width. Times offered
 * after a decline, an expiry or the business's cancel show as chips ({@link OfferTimes}); once they've all passed, the
 * card says so with the way to the business's page.
 */
export function BookingRow({
  booking: b,
  tab,
  onReview,
}: {
  booking: MyBooking
  tab: 'upcoming' | 'past'
  /**
   * «Write a review» or «Edit the review»: the page's one form opens for it (it outlives the row's button, gone once
   * it's sent); the row's `review` says which.
   */
  onReview?: (booking: MyBooking) => void
}) {
  const t = useTranslations('myBookings')
  const words = useTranslations()
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const undoFailedText = useUndoFailed()
  const at = useWhen()
  const cancelledBy = useCancelledBy()
  const restore = useMutation(sdk.bookings.restore(lang))
  const [undoFailed, setUndoFailed] = useState<string | null>(null)
  const visit = useVisitLine()
  const services = whatParts(b.what)[0] ?? ''
  const when = at(b.date, b.start, b.end)
  const live = b.offers?.times.some((o) => o.state === 'free') ? b.offers : null
  const passed = b.offers && !live ? b.offers : null
  const ahead = b.status === 'pending' || b.status === 'confirmed'
  const by = cancelledBy(b)
  const reason = b.decline
    ? { reason: words(`declineReasons.${b.decline.reason}`), text: b.decline.text }
    : b.businessCancel
      ? { reason: words(`businessCancelReasons.${b.businessCancel.reason}`), text: b.businessCancel.text }
      : null
  const took = b.offerTakenBy
    ? b.cancelledBy === 'system'
      ? t('tookRequest', { code: b.offerTakenBy })
      : t('tookOffer', { code: b.offerTakenBy })
    : null

  const undo = () =>
    restore.mutate(
      { code: b.code, body: undefined },
      {
        onSuccess: () => toast(t('undone')),
        // said in the row, Undo gone: the time isn't coming back (Account-Bookings `undoFailed`)
        onError: (error) => setUndoFailed(undoFailedText(error)),
      },
    )

  const waiting = b.status === 'pending' && !b.reschedule
  const means = waiting || b.status === 'noshow' || !!by || !!b.reschedule
  const actions = [
    (ahead || !b.bookOnline || b.actions.callOnly) && (
      // named from what it shows, the business read but not seen: «Call» stays in the name whatever the language
      // or the words' length (axe: label-content-name-mismatch)
      <Button key="call" asChild size="s" variant="tertiary">
        <a href={telHref(b.business.phone)}>
          <Phone aria-hidden />
          {t.rich('callLabel', { business: b.business.name, hidden })}
        </a>
      </Button>
    ),
    b.actions.restore && !undoFailed && (
      // the card's actions name their booking the same way: the word seen, the booking read
      <Button key="undo" size="s" variant="tertiary" loading={restore.isPending} onClick={() => !restore.isPending && undo()}>
        {t.rich('undoLabel', { business: b.business.name, when, hidden })}
      </Button>
    ),
    b.actions.review && onReview && (
      <Button key="review" size="s" variant="secondary" onClick={() => onReview(b)}>
        {t.rich('writeReviewLabel', { business: b.business.name, when, hidden })}
      </Button>
    ),
    b.actions.editReview && b.review && onReview && (
      // the review to change while it may be (book C-35, 7 days), as the drawer offers it
      <Button key="edit" size="s" variant="tertiary" onClick={() => onReview(b)}>
        {t.rich('editReviewLabel', { business: b.business.name, when, hidden })}
      </Button>
    ),
    b.actions.bookAgain && (
      <Button key="again" asChild size="s" variant="secondary">
        <Link to="/$lang/b/$slug" params={{ lang, slug: b.business.slug }}>
          {t('bookAgain')}
        </Link>
      </Button>
    ),
  ].filter(Boolean)

  return (
    <div className="relative grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-card border border-n-200 p-4 hover:bg-n-50">
      {b.business.photo ? (
        <img
          src={b.business.photo.url}
          alt=""
          className={cn('block size-16 rounded-ctl-l object-cover', b.cancelledBy === 'client' && 'opacity-50')}
        />
      ) : (
        <span aria-hidden className="flex size-16 items-center justify-center rounded-ctl-l bg-n-100 text-n-500">
          <Building2 className="size-6" strokeWidth={1.75} />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          {/* the whole card opens the booking; what's pressable in it sits above the link (`relative`) */}
          <Link
            id={rowLinkId(b.code)}
            to="/$lang/account/bookings/$code"
            params={{ lang, code: b.code }}
            search={{ tab: tab === 'past' ? 'past' : undefined }}
            resetScroll={false}
            // which booking it opens, with the name seen first (axe: label-content-name-mismatch)
            aria-label={t('openLabel', { business: b.business.name, when })}
            className={cn(
              'min-w-0 text-[16px] leading-[22px] font-semibold text-n-900 outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:shadow-focus',
              b.cancelledBy === 'client' && 'text-n-600',
            )}
          >
            {b.business.name}
          </Link>
          <span className="flex flex-none">
            <BookingStatusBadge status={b.status} />
          </span>
        </div>
        {(services || b.price) && (
          <span className="text-small text-n-600">
            {services && visit(b.what)}
            {services && b.price && ' · '}
            {b.price && <Price hidden={b.price.type === 'hidden'}>{fmt.price(b.price)}</Price>}
          </span>
        )}
        <span className={cn('inline-flex items-center gap-1.5 text-small', live ? 'text-n-500 line-through' : 'text-n-900')}>
          <CalendarDays aria-hidden className="size-4 flex-none text-n-600" strokeWidth={1.75} />
          {when}
          {(b.source === 'phone' || b.source === 'walkin') && (
            <Phone role="img" aria-label={t('byPhone')} className="size-3.5 flex-none text-n-600" strokeWidth={1.75} />
          )}
        </span>
        {means && (
          <div className="flex flex-wrap items-center gap-2.5">
            {waiting && <ByLine>{t('waiting')}</ByLine>}
            {b.status === 'noshow' && <ByLine>{t('noshow')}</ByLine>}
            {by && <ByLine icon={by.icon}>{by.text}</ByLine>}
            {b.reschedule && (
              <ByLine icon={<Clock aria-hidden className="text-st-pending-ink" />}>
                {t('moveWaiting', { when: at(b.reschedule.date, b.reschedule.start, b.reschedule.end) })}
              </ByLine>
            )}
          </div>
        )}
        {reason && (
          <span className="text-dense text-n-600">
            {reason.text ? t('reasonWith', { reason: reason.reason, text: reason.text }) : t('reason', { reason: reason.reason })}
          </span>
        )}
        {took && b.offerTakenBy && (
          // the booking the offered time became, on Upcoming (Account-Bookings `openNew`)
          <Link
            to="/$lang/account/bookings/$code"
            params={{ lang, code: b.offerTakenBy }}
            resetScroll={false}
            className="relative self-start text-dense font-semibold text-a-600 hover:text-a-700"
          >
            {took}
          </Link>
        )}
        {passed && (
          <span className="relative inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-dense text-n-600">
            {t('offersPassed')}
            <Link to="/$lang/b/$slug" params={{ lang, slug: b.business.slug }} className="font-semibold text-a-600 hover:text-a-700">
              {t('otherTime')}
            </Link>
          </span>
        )}
        {undoFailed && (
          <span role="alert" className="relative inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-dense text-danger-ink">
            <span className="inline-flex items-start gap-1.5">
              <CircleAlert aria-hidden className="mt-0.5 size-3.5 flex-none" strokeWidth={2} />
              {undoFailed}
            </span>
            <Link to="/$lang/b/$slug" params={{ lang, slug: b.business.slug }} className="font-semibold text-a-600 hover:text-a-700">
              {t('otherTime')}
            </Link>
          </span>
        )}
      </div>
      {live && (
        <div className="relative col-span-2">
          <OfferTimes code={b.code} business={b.business.name} services={services} offers={live} />
        </div>
      )}
      {(b.review || actions.length > 0) && (
        <div className="relative col-span-2 flex items-center justify-between gap-3 border-t border-n-200 pt-3 max-sm:flex-col max-sm:items-stretch">
          {b.review ? <YouRated rating={b.review.rating} /> : <span />}
          {actions.length > 0 && <div className="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-auto">{actions}</div>}
        </div>
      )}
    </div>
  )
}
