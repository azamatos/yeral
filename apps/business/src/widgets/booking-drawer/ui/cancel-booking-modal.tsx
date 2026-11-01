import { useMutation } from '@tanstack/react-query'
import type { CalendarBooking } from '@yeral/contract/calendar'
import { TEAM_CANCEL_REASONS } from '@yeral/domain/model'
import { Button } from '@yeral/ui/button'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { Textarea } from '@yeral/ui/input'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { toast } from '@yeral/ui/toast'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

type Reason = (typeof TEAM_CANCEL_REASONS)[number]

/** «Another reason» in words, as the api takes it (`businessCancelSchema`); the client sees it. */
const REASON_MAX = 300

/**
 * «Cancel the booking» (B-Calendar cancel modal, book B-27): the reason as a chip, «Another reason» in words. «The
 * client called to cancel» is the client's own cancel (they see «You cancelled»); the others are the business's, with
 * the reason shown. The danger button; a toast when it lands (no Undo: the api has none, the SMS goes at once).
 */
export function CancelBookingModal({
  slug,
  booking: b,
  context,
  onOpenChange,
  onCancelled,
}: {
  slug: string
  booking: CalendarBooking
  /** The booking in one line («Gözel Annaýewa · Women’s haircut · Wednesday, 14 October · 10:00–11:00»). */
  context: string
  onOpenChange: (open: boolean) => void
  /** Cancelled: the drawer closes (the block leaves the grid unless «Show cancelled» is on). */
  onCancelled: () => void
}) {
  const t = useTranslations('bookingDrawer.cancel')
  const sdk = useSdk()
  const errorText = useErrorText()
  const id = useId()
  const cancel = useMutation(sdk.calendar.cancel(slug))
  const [reason, setReason] = useState<Reason | null>(null)
  const [text, setText] = useState('')
  const [failed, setFailed] = useState<string | null>(null)
  const words = text.trim()
  const ready = reason !== null && (reason !== 'other' || words.length > 0)
  const submit = () => {
    if (!reason || !ready) return
    setFailed(null)
    // the push channel can bring the cancelled booking before this answer, and that takes the modal away: `mutate`'s own
    // callbacks would go with it
    void cancel.mutateAsync({ code: b.code, reason, ...(reason === 'other' ? { text: words } : {}) }).then(
      () => {
        toast(t('done'))
        onCancelled()
      },
      // already started, or changed meanwhile: said here, the booking reads back
      (error: unknown) => setFailed(errorText(error)),
    )
  }
  const reasons = TEAM_CANCEL_REASONS.map((value) => ({ value, label: t(`reasons.${value}`) }))

  return (
    <Modal open onOpenChange={onOpenChange}>
      <ModalContent size={480}>
        <ModalHeader title={t('title')} closeLabel={t('close')}>
          <ModalDescription>{t('lead')}</ModalDescription>
          <span className="text-dense text-n-600">{context}</span>
        </ModalHeader>
        <div className="flex flex-col gap-2.5">
          <span id={`${id}-reason`} className="text-small font-medium text-n-900">
            {t('reason')}
          </span>
          <ChipRadioGroup
            aria-labelledby={`${id}-reason`}
            options={reasons}
            value={reason ?? ''}
            onValueChange={(value) => setReason(value as Reason)}
          />
          {reason === 'other' && (
            <Textarea
              aria-label={t('otherLabel')}
              placeholder={t('otherPlaceholder')}
              value={text}
              maxLength={REASON_MAX}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </div>
        {failed && (
          <p role="alert" className="m-0 text-dense text-danger-ink">
            {failed}
          </p>
        )}
        <ModalActions>
          <Button variant="secondary" disabled={cancel.isPending} onClick={() => onOpenChange(false)}>
            {t('back')}
          </Button>
          <Button variant="danger-solid" disabled={!ready} loading={cancel.isPending} onClick={submit}>
            {t('confirm')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
