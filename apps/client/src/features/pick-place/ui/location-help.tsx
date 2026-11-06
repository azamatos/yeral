import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import type { RefObject } from 'react'
import { useTranslations } from 'use-intl'

/**
 * The short help sheet (States 03, C7-Home «How to allow»): how to let the browser share the location. Opened from code,
 * not a Dialog.Trigger, so Radix gives the focus back to nothing: `backTo` is the field that takes it when it closes.
 */
export function LocationHelp({
  open,
  onOpenChange,
  backTo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  backTo?: RefObject<HTMLElement | null>
}) {
  const t = useTranslations('location')
  if (!open) return null
  return (
    <Modal open onOpenChange={onOpenChange}>
      <ModalContent
        size={400}
        onCloseAutoFocus={(e) => {
          if (!backTo?.current) return
          e.preventDefault()
          backTo.current.focus()
        }}
      >
        <ModalHeader title={t('helpTitle')} closeLabel={t('close')}>
          <ModalDescription>{t('helpText')}</ModalDescription>
        </ModalHeader>
        <ModalActions>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
