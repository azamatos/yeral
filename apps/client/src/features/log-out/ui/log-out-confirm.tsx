import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalClose, ModalContent, ModalHeader, ModalTrigger } from '@yeral/ui/modal'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useLogOut } from '../model/use-log-out'

/**
 * «Log out of Ýeral on this device?» · Cancel · Log out (book C-46; the Modal's 480 confirm, as the account's delete):
 * the one question every «Log out» asks, on the account page, in the header's menu and its phone sheet, and in the
 * account aside. With `children` the button is the dialog's trigger and the focus comes back to it; a row of a menu
 * that closes as it's chosen opens it instead with `open` / `onOpenChange`, and says with `onCloseAutoFocus` where the
 * focus goes then. A failure keeps the dialog (the toast says why), so Log out can be tried again.
 */
export function LogOutConfirm({
  children,
  open,
  onOpenChange,
  onDone,
  onCloseAutoFocus,
}: {
  /** The trigger. */
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Logged out (the caller closes what it had open). */
  onDone?: () => void
  onCloseAutoFocus?: ComponentProps<typeof ModalContent>['onCloseAutoFocus']
}) {
  const t = useTranslations()
  const [own, setOwn] = useState(false)
  const shown = open ?? own
  const setShown = onOpenChange ?? setOwn
  const { logOut, loggingOut } = useLogOut({
    onDone: () => {
      setShown(false)
      onDone?.()
    },
  })
  return (
    <Modal
      open={shown}
      onOpenChange={(next) => {
        if (loggingOut) return
        setShown(next)
      }}
    >
      {children && <ModalTrigger asChild>{children}</ModalTrigger>}
      <ModalContent size={480} aria-describedby={undefined} onCloseAutoFocus={onCloseAutoFocus}>
        <ModalHeader title={t('account.logOutTitle', { brand: t('common.brand') })} closeLabel={t('account.close')} />
        <ModalActions>
          <ModalClose asChild>
            <Button disabled={loggingOut}>{t('account.logOutCancel')}</Button>
          </ModalClose>
          <Button variant="primary" loading={loggingOut} onClick={logOut}>
            {t('account.logOut')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
