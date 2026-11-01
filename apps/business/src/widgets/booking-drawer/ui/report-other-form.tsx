import { Button } from '@yeral/ui/button'
import { Textarea } from '@yeral/ui/input'
import { Modal, ModalActions, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { useState } from 'react'
import { useTranslations } from 'use-intl'

/** «Other» in words, as the api takes it (`complaintInputSchema`). */
export const REPORT_TEXT_MAX = 300

/**
 * «What happened?» (B-Calendar `panel=complaint`, book B-28): the words of an «Other» report, saved to the client's
 * card for the team alone. A sheet under 640.
 */
export function ReportOtherForm({
  context,
  pending,
  onOpenChange,
  onSave,
}: {
  context: string
  /** The report on its way: the form stays until it lands. */
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSave: (text: string) => void
}) {
  const t = useTranslations('bookingDrawer.report')
  const [text, setText] = useState('')
  const words = text.trim()
  return (
    <Modal open onOpenChange={onOpenChange}>
      <ModalContent size={480}>
        <ModalHeader title={t('otherTitle')} closeLabel={t('close')}>
          <span className="text-dense text-n-600">{context}</span>
        </ModalHeader>
        <Textarea
          aria-label={t('otherField')}
          placeholder={t('otherPlaceholder')}
          value={text}
          maxLength={REPORT_TEXT_MAX}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="m-0 text-dense text-n-600">{t('otherCaption')}</p>
        <ModalActions>
          <Button variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
            {t('back')}
          </Button>
          <Button variant="primary" disabled={!words} loading={pending} onClick={() => onSave(words)}>
            {t('save')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
