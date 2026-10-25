import { useMutation } from '@tanstack/react-query'
import type { BookingDetail } from '@yeral/contract/bookings'
import { isApiError } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Chip } from '@yeral/ui/chip'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { toast } from '@yeral/ui/toast'
import { Clock } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useErrorText } from '@/shared/i18n'
import { CANCEL_REASONS, type CancelReason } from '../model/drawer'
import { UNDO_REASONS } from './booking-row'

/**
 * «Cancel the booking?» (Account-Bookings `showCancel`, book C-29): what's cancelled, that it's free, the move request
 * that goes with it, the reason chips when the business asks for one (still optional; the chip's words go as the
 * client's), Back and «Yes, cancel». Done, the drawer closes and a toast says so with Undo (`restore`, the shared
 * «Couldn't undo — …»).
 */
export function CancelBooking({
  booking: b,
  what,
  when,
  open,
  onOpenChange,
  onCancelled,
}: {
  booking: BookingDetail
  /** What was booked («Women's haircut · Aýna»). */
  what: string
  when: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Done: the drawer closes (Account-Bookings `confirmCancel`), so the toast's Undo is in reach. */
  onCancelled: () => void
}) {
  const t = useTranslations('bookingDrawer')
  const words = useTranslations()
  const lang = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const cancel = useMutation(sdk.bookings.cancel(lang))
  const restore = useMutation(sdk.bookings.restore(lang))
  const [reason, setReason] = useState<CancelReason | null>(null)
  // the toast's Undo comes after the drawer has gone: a promise, since `mutate`'s callbacks die with the component
  const undo = () =>
    restore.mutateAsync({ code: b.code, body: undefined }).then(
      () => toast(t('undone')),
      (error: unknown) => {
        const why = UNDO_REASONS.find((r) => isApiError(error, r))
        toast(why ? words('undo.failed', { reason: words(`undo.reasons.${why}`) }) : errorText(error))
      },
    )
  const send = () =>
    cancel.mutate(
      { code: b.code, body: b.askCancelReason && reason ? { reason: t(`reasons.${reason}`) } : {} },
      {
        onSuccess: () => {
          onOpenChange(false)
          onCancelled()
          toast(t('cancelled'), { action: { label: t('undo'), onClick: () => void undo() } })
        },
        onError: (error) => toast(errorText(error)),
      },
    )
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason(null)
        onOpenChange(next)
      }}
    >
      <ModalContent>
        <ModalHeader title={t('cancelTitle')} closeLabel={t('close')}>
          <ModalDescription>{t('cancelText', { business: b.business.name, what, when })}</ModalDescription>
        </ModalHeader>
        {b.reschedule && (
          <p className="m-0 flex items-start gap-2.5 rounded-m bg-group px-3.5 py-3 text-small text-n-900">
            <Clock aria-hidden className="mt-px size-4.5 flex-none text-st-pending-ink" strokeWidth={2} />
            {t('cancelMove')}
          </p>
        )}
        {b.askCancelReason && (
          <div className="flex flex-col gap-2.5">
            <span id={`${b.code}-reason`} className="text-small font-semibold text-n-900">
              {t('reasonLabel')}
            </span>
            <div role="group" aria-labelledby={`${b.code}-reason`} className="flex flex-wrap gap-2">
              {CANCEL_REASONS.map((r) => (
                <Chip key={r} selected={reason === r} aria-pressed={reason === r} onClick={() => setReason(reason === r ? null : r)}>
                  {t(`reasons.${r}`)}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <ModalActions>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('back')}
          </Button>
          <Button variant="danger-solid" loading={cancel.isPending} onClick={() => !cancel.isPending && send()}>
            {t('confirmCancel')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
