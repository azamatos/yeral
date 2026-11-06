import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { useTranslations } from 'use-intl'

/** The short help sheet (States 03, C7-Home «How to allow»): how to let the browser share the location. */
export function LocationHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('location')
  if (!open) return null
  return (
    <Modal open onOpenChange={onOpenChange}>
      <ModalContent size={400}>
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
