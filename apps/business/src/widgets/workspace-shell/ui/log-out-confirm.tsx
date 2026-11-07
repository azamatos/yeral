import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalClose, ModalContent, ModalHeader } from '@yeral/ui/modal'
import type { RefObject } from 'react'
import { useTranslations } from 'use-intl'
import { useAccount } from '../model/use-account'

/**
 * «Log out of Ýeral on this device?» · Cancel · Log out (owner, 07.11; the Modal's 480 confirm): what the account
 * menu's and More's «Log out» open before the session ends. Cancel gives the focus back to what opened it (the menu's
 * button, More). A failure keeps the dialog (the toast says why), so Log out can be tried again.
 */
export function LogOutConfirm({
  open,
  onOpenChange,
  opener,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  opener: RefObject<HTMLElement | null>
}) {
  const t = useTranslations()
  const account = useAccount()
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (account.leaving) return
        onOpenChange(next)
      }}
    >
      <ModalContent
        size={480}
        aria-describedby={undefined}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          opener.current?.focus()
        }}
      >
        <ModalHeader title={t('shell.account.logoutTitle', { brand: t('common.brand') })} closeLabel={t('shell.profile.close')} />
        <ModalActions>
          <ModalClose asChild>
            <Button disabled={account.leaving}>{t('shell.account.logoutCancel')}</Button>
          </ModalClose>
          <Button variant="primary" loading={account.leaving} onClick={account.logout}>
            {t('shell.account.logout')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
