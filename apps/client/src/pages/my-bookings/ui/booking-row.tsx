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

/** A line under the status (`.bby`): a 14 icon and a 13/18 caption. */
export function ByLine({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-dense text-n-600 [&_svg]:size-3.5 [&_svg]:flex-none">
      {icon}
      {children}
    </span>
  )
}

/** The drawer's `.rated` (Account-Bookings): the star and «5 · You rated», heard as «You rated it 5 out of 5». */
export function YouRated({ rating }: { rating: number }) {
  const t = useTranslations('myBookings')
  return (
    <Rating
      role="img"
      aria-label={t('ratedLabel', { rating })}
      value={t('rated', { rating })}
      className="gap-1.5 self-start text-small leading-[18px] [&_svg]:size-4"
    />
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
 * A row of My bookings (Account-Bookings `.brow`, book C-23–C-31, C-40): the business's photo, its name (opening the
 * booking in the drawer: the whole row answers to it), what and when (a phone icon for a booking the business made by
 * phone; the time struck through while offered times stand in for it), the status with what it means now (waiting
 * for the business, who cancelled, a no-show, a waiting move), the reason of a decline or the business's cancel, the
 * price, and what can be done now: Call while it's ahead (and for a client booked by phone only), Undo after the
 * client's own cancel (its failure said in the row), Write a review after a visit (`features/write-review`), «★ 5 · You
 * rated» once reviewed with Edit the review while it may change (7 days, as the drawer), Book again. Times offered
 * after a decline, an expiry or the business's cancel show as chips ({@link OfferTimes}); once they've all passed, the
 * row says so with the way to the business's page.
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

  return (
    <div className="relative grid grid-cols-[96px_minmax(0,1fr)_auto] gap-5 rounded-card px-4 py-5 hover:bg-n-50 max-sm:grid-cols-[64px_minmax(0,1fr)] max-sm:gap-x-3.5 max-sm:gap-y-3 max-sm:px-0 max-sm:hover:bg-transparent">
      {b.business.photo ? (
        <img
          src={b.business.photo.url}
          alt=""
          className={cn('block size-24 rounded-m object-cover max-sm:size-16', b.cancelledBy === 'client' && 'opacity-50')}
        />
      ) : (
        <span aria-hidden className="flex size-24 items-center justify-center rounded-m bg-n-100 text-n-500 max-sm:size-16">
          <Building2 className="size-7" strokeWidth={1.75} />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        {/* the whole row opens the booking; what's pressable in it sits above the link (`relative`) */}
        <Link
          id={rowLinkId(b.code)}
          to="/$lang/account/bookings/$code"
          params={{ lang, code: b.code }}
          search={{ tab: tab === 'past' ? 'past' : undefined }}
          resetScroll={false}
          // which booking it opens, with the name seen first (axe: label-content-name-mismatch)
          aria-label={t('openLabel', { business: b.business.name, when })}
          className={cn(
            'text-[16px] leading-[22px] font-semibold text-n-900 outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:shadow-focus',
            b.cancelledBy === 'client' && 'text-n-600',
          )}
        >
          {b.business.name}
        </Link>
        {services && <span className="text-small text-n-600">{visit(b.what)}</span>}
        <span className={cn('inline-flex items-center gap-1.5 text-small', live ? 'text-n-500 line-through' : 'text-n-900')}>
          <CalendarDays aria-hidden className="size-4 flex-none text-n-600" strokeWidth={1.75} />
          {when}
          {(b.source === 'phone' || b.source === 'walkin') && (
            <Phone role="img" aria-label={t('byPhone')} className="size-3.5 flex-none text-n-600" strokeWidth={1.75} />
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
          <BookingStatusBadge status={b.status} />
          {b.status === 'pending' && !b.reschedule && <ByLine>{t('waiting')}</ByLine>}
          {b.status === 'noshow' && <ByLine>{t('noshow')}</ByLine>}
          {by && <ByLine icon={by.icon}>{by.text}</ByLine>}
          {b.reschedule && (
            <ByLine icon={<Clock aria-hidden className="text-st-pending-ink" />}>
              {t('moveWaiting', { when: at(b.reschedule.date, b.reschedule.start, b.reschedule.end) })}
            </ByLine>
          )}
        </div>
        {reason && (
          <span className="text-dense text-n-600">
            {reason.text ? t('reasonWith', { reason: reason.reason, text: reason.text }) : t('reason', { reason: reason.reason })}
          </span>
        )}
        {b.review && <YouRated rating={b.review.rating} />}
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
      <div className="flex flex-col items-end justify-between gap-3 max-sm:col-span-2 max-sm:flex-row max-sm:items-center">
        {b.price ? <Price hidden={b.price.type === 'hidden'}>{fmt.price(b.price)}</Price> : <span />}
        <div className="relative flex flex-wrap items-center justify-end gap-1">
          {(ahead || !b.bookOnline || b.actions.callOnly) && (
            <Button asChild size="s" variant="ghost">
              <a href={telHref(b.business.phone)} aria-label={t('callLabel', { business: b.business.name })}>
                <Phone aria-hidden />
                {t('call')}
              </a>
            </Button>
          )}
          {b.actions.restore && !undoFailed && (
            <Button
              size="s"
              variant="ghost"
              loading={restore.isPending}
              aria-label={t('undoLabel', { business: b.business.name, when })}
              onClick={() => !restore.isPending && undo()}
            >
              {t('undo')}
            </Button>
          )}
          {b.actions.review && onReview && (
            <Button
              size="s"
              variant="secondary"
              aria-label={t('writeReviewLabel', { business: b.business.name, when })}
              onClick={() => onReview(b)}
            >
              {t('writeReview')}
            </Button>
          )}
          {b.actions.editReview && b.review && onReview && (
            // the review to change while it may be (book C-35, 7 days), as the drawer offers it
            <Button
              size="s"
              variant="ghost"
              aria-label={t('editReviewLabel', { business: b.business.name, when })}
              onClick={() => onReview(b)}
            >
              {t('editReview')}
            </Button>
          )}
          {b.actions.bookAgain && (
            <Button asChild size="s" variant="secondary">
              <Link to="/$lang/b/$slug" params={{ lang, slug: b.business.slug }}>
                {t('bookAgain')}
              </Link>
            </Button>
          )}
        </div>
      </div>
      {live && (
        <div className="relative col-start-2 col-end-[-1] max-sm:col-start-1">
          <OfferTimes code={b.code} business={b.business.name} services={services} offers={live} />
        </div>
      )}
    </div>
  )
}
