import type { BookingsAffectedDetails } from '@yeral/contract/errors'
import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { OptionCard, OptionCardGroup } from '@yeral/ui/option-card'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AffectedBookingsList, useAffectedCount } from '@/entities/booking'

export type AffectedChoice = 'keep' | 'cancel'

type ModalProps = {
  /** The 409's list; null while nothing waits for a choice. */
  details: BookingsAffectedDetails | null
  lead: string
  saving: boolean
  onSave: (choice: AffectedChoice) => void
  onClose: () => void
  /**
   * Another change's words (B-Team: a shift, time off): the title from the count («5 bookings and 1 request»), the lead
   * as given, Keep them's caption, the line under the list and the button. Without them, the business hours'.
   */
  words?: { title: (what: string, n: number) => string; keepCaption: string; foot: string; save: string }
}

/**
 * «5 bookings and 1 request fall outside the new hours» (B-Settings, design §28.5 hours, book Q-211): the changed days
 * as the lead, Keep them or Cancel and offer 3 other times, the list, and Save sends the save again with the choice.
 * New bookings follow the new hours either way. Each opening starts on Keep them.
 */
export function HoursAffectedBookings({ details, saving, onClose, ...rest }: ModalProps) {
  return (
    <Modal
      open={details !== null}
      onOpenChange={(next) => {
        if (!next && !saving) onClose()
      }}
    >
      {details && <AffectedBody details={details} saving={saving} onClose={onClose} {...rest} />}
    </Modal>
  )
}

function AffectedBody({ details, lead, saving, onSave, onClose, words }: ModalProps & { details: BookingsAffectedDetails }) {
  const t = useTranslations('affected')
  const count = useAffectedCount()
  const [choice, setChoice] = useState<AffectedChoice>('keep')
  const labelId = useId()
  return (
    <ModalContent size={560} className="gap-4.5">
      <ModalHeader
        title={
          words
            ? words.title(count(details.counts, 'and'), details.count)
            : t('hoursTitle', { what: count(details.counts, 'and'), n: details.count })
        }
        closeLabel={t('close')}
      >
        <ModalDescription>{words ? lead : t('hoursLead', { days: lead })}</ModalDescription>
      </ModalHeader>
      <OptionCardGroup value={choice} onValueChange={(v) => setChoice(v as AffectedChoice)} aria-label={t('what')} className="gap-2">
        <OptionCard value="keep" indicator="start" title={t('keep')} caption={words?.keepCaption ?? t('keepCaption')} />
        <OptionCard value="cancel" indicator="start" title={t('cancel')} caption={t('cancelCaption')} />
      </OptionCardGroup>
      <div className="flex flex-col gap-2">
        <span id={labelId} className="text-n-700 text-label font-semibold">
          {count(details.counts, 'dot')}
        </span>
        <AffectedBookingsList bookings={details.bookings} labelledBy={labelId} />
        {details.count > details.bookings.length && (
          <span className="text-dense text-n-600">{t('more', { n: details.count - details.bookings.length })}</span>
        )}
      </div>
      <p className="m-0 text-dense text-n-600">{words?.foot ?? t('hoursEither')}</p>
      <ModalActions>
        <Button variant="secondary" disabled={saving} onClick={onClose}>
          {t('back')}
        </Button>
        <Button variant="primary" loading={saving} loadingLabel={t('saving')} onClick={() => onSave(choice)}>
          {words?.save ?? t('save')}
        </Button>
      </ModalActions>
    </ModalContent>
  )
}
