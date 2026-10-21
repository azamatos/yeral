import { useMutation } from '@tanstack/react-query'
import type { Workspace } from '@yeral/contract/team'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader, ModalTrigger } from '@yeral/ui/modal'
import { toast } from '@yeral/ui/toast'
import { useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

/**
 * "Leave Glow Studio?" (book B-15; B-Shell, DS-Business LeaveWorkspaceConfirm, Modal S): danger, the focus starts on
 * Cancel, and back on the button that asked when it closes. The workspace on screen only; the account and the other workspaces stay, and the person's bookings stay with
 * the business for the owner to hand on. Once left, the shell takes them to their last used other workspace (or the
 * sign-in, which says they have none). The api's refusals: the owner can't leave (the drawer never offers it; its words
 * if it ever comes), and a workspace they're no longer on is left already.
 */
export function LeaveConfirm({ workspace, onLeft, children }: { workspace: Workspace; onLeft: () => void; children: ReactNode }) {
  const t = useTranslations('shell.leave')
  const sdk = useSdk()
  const errorText = useErrorText()
  const leave = useMutation(sdk.team.leave())
  const [open, setOpen] = useState(false)
  const left = () => {
    setOpen(false)
    onLeft()
  }
  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>{children}</ModalTrigger>
      <ModalContent size={400}>
        <ModalHeader title={t('title', { business: workspace.name })} closeLabel={t('close')} />
        <ModalDescription>{t('text')}</ModalDescription>
        <ModalActions>
          <Button variant="secondary" autoFocus onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="danger-solid"
            loading={leave.isPending}
            onClick={() =>
              leave.mutate(workspace.slug, {
                onSuccess: left,
                onError: (error) => {
                  // not on that team any more (removed meanwhile, or left on another device): done already (the sdk
                  // forgets it as for a leave)
                  if (isApiError(error, 'not_found')) left()
                  else toast(errorText(error))
                },
              })
            }
          >
            {t('confirm', { business: workspace.name })}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
