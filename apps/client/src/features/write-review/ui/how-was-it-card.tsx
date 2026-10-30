import { useMutation, useQuery } from '@tanstack/react-query'
import type { BookingDetail, BookingSummary } from '@yeral/contract/bookings'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { RatingInput } from '@yeral/ui/rating'
import { toast } from '@yeral/ui/toast'
import { X } from 'lucide-react'
import { useId, useState, type RefObject } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { visitLine } from '@/entities/booking'
import { useErrorText } from '@/shared/i18n'
import { ReviewModal } from './review-modal'

/**
 * The «How was it?» card (book F-243, Q-259; My bookings and, with slice 5, the home page), the review's other way in
 * beside «Write a review», so it lives with the form: the latest completed visit still open to a review and not
 * closed, as the api answers it (`GET /me/how-was-it`, one card at a time), with the business, the visit and the five
 * stars; a star pressed opens the review form with it picked, on the visit pressed (the card may move on to another
 * visit meanwhile: the form keeps the one the stars were for), and the review sent ends the card (the sdk reads it
 * again: the visit before it asks next, or none). The cross closes it for good for that visit, with one tap, as the
 * book says; no «Later». Nothing while there is no visit to ask about, while it loads, or when the api fails (the
 * card is a nudge, never an error). Drawn after the nearest patterns: the calm info card (white, n-200 line, r16, pad
 * 24) and the review modal's head (the business's photo 48, its name, the visit).
 */
export function HowWasItCard({
  className,
  returnFocus,
  onDone,
}: {
  className?: string
  /** Where the focus goes once the form closes (the stars are gone with the card by then); the caller decides. */
  returnFocus?: RefObject<HTMLElement | null>
  /** The review was sent: the booking as the api answers it now. */
  onDone?: (booking: BookingDetail) => void
}) {
  const t = useTranslations('howWasIt')
  const r = useTranslations('review')
  const lang = useLocale()
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const ask = useQuery(sdk.bookings.howWasIt(lang))
  const close = useMutation(sdk.bookings.closeHowWasIt())
  // the star pressed and the visit it was pressed for: the form opens on them, whatever the card asks about by then;
  // none again once the form closes without sending
  const [pressed, setPressed] = useState<{ visit: BookingSummary; rating: number } | null>(null)
  const titleId = useId()
  const visit = ask.data?.visit ?? null

  return (
    <>
      {visit && (
        <section
          aria-labelledby={titleId}
          className={cn('flex flex-col gap-4 rounded-card border border-n-200 bg-n-0 p-6 text-n-900 max-sm:p-5', className)}
        >
          <div className="flex items-start gap-3">
            {visit.business.photo ? (
              <img src={visit.business.photo.url} alt="" className="size-12 flex-none rounded-s object-cover" />
            ) : (
              <Avatar name={visit.business.name} size={48} shape="square" tone="neutral" decorative />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h2 id={titleId} className="m-0 text-[19px] leading-6 font-bold tracking-[-0.01em] text-pretty">
                {t('title')}
              </h2>
              <span className="truncate text-body font-semibold">{visit.business.name}</span>
              <span className="text-dense text-n-600">{visitLine(visit, fmt)}</span>
            </div>
            <Button
              variant="ghost"
              iconOnly
              size="s"
              aria-label={t('close')}
              disabled={close.isPending}
              className="-mt-1 -mr-2 flex-none rounded-s"
              onClick={() => close.mutate(visit.code, { onError: (error) => toast(errorText(error)) })}
            >
              <X />
            </Button>
          </div>
          <RatingInput
            value={pressed?.visit.code === visit.code ? pressed.rating : null}
            onValueChange={(rating) => setPressed({ visit, rating })}
            label={r('rating')}
            starLabel={(count) => r('star', { count })}
            words={[r('words.1'), r('words.2'), r('words.3'), r('words.4'), r('words.5')]}
            className="-ml-2"
          />
        </section>
      )}
      {pressed && (
        <ReviewModal
          booking={pressed.visit}
          rating={pressed.rating}
          open
          onOpenChange={(open) => !open && setPressed(null)}
          onDone={onDone}
          returnFocus={returnFocus}
        />
      )}
    </>
  )
}
