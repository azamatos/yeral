import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { Modal, ModalActions, ModalClose, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'

/** `adminReasonSchema`'s limit. */
const REASON_MAX = 500

/** An action that needs a reason: sending a business back, hiding or closing it, removing a review. */
export function ReasonModal({
  title,
  lead,
  hint,
  action,
  pending,
  onConfirm,
  onClose,
}: {
  title: string
  lead: string
  /** Who reads it. */
  hint: string
  action: string
  pending: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const t = useTranslations('reason')
  const [reason, setReason] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (reason.trim()) onConfirm(reason.trim())
  }
  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <ModalHeader title={title} closeLabel={t('cancel')} />
        <ModalDescription>{lead}</ModalDescription>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t('label')} hint={hint}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={REASON_MAX} rows={4} required />
          </Field>
          <ModalActions>
            <ModalClose asChild>
              <Button>{t('cancel')}</Button>
            </ModalClose>
            <Button type="submit" variant="danger" loading={pending}>
              {action}
            </Button>
          </ModalActions>
        </form>
      </ModalContent>
    </Modal>
  )
}
