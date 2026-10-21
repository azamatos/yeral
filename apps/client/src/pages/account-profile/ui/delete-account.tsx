import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { isApiError } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Modal, ModalActions, ModalClose, ModalContent, ModalDescription, ModalHeader, ModalTrigger } from '@yeral/ui/modal'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useErrorText } from '@/shared/i18n'

/**
 * Deleting the account (book C-47, Q-172; Account-Profile «Hasaby öçür» and its modal): the danger S button, then a 480
 * modal that says what goes (upcoming bookings cancelled and the businesses told; the account, favourites and reviews
 * deleted; the businesses keep their own visit records) with Back and the solid danger «Delete account»
 * (`DELETE /v1/me`). Done, the person is signed out and lands on Home with a toast. An owner of a business can't
 * (`owns_workspace`): the modal says why.
 */
export function DeleteAccount() {
  const t = useTranslations()
  const sdk = useSdk()
  const lang = useLocale()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const [open, setOpen] = useState(false)
  const remove = useMutation(sdk.me.remove())
  const ownsBusiness = isApiError(remove.error, 'owns_workspace')

  const confirm = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        setOpen(false)
        toast(t('profile.deleted'))
        void navigate({ to: '/$lang', params: { lang }, replace: true })
      },
      onError: (error) => {
        if (!isApiError(error, 'owns_workspace')) toast(errorText(error))
      },
    })

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (remove.isPending) return
        setOpen(next)
        if (!next) remove.reset()
      }}
    >
      <ModalTrigger asChild>
        <Button variant="danger" size="s">
          {t('profile.delete')}
        </Button>
      </ModalTrigger>
      <ModalContent size={480}>
        <ModalHeader title={t('profile.deleteTitle')} closeLabel={t('account.close')}>
          <ModalDescription>{t('profile.deleteBody')}</ModalDescription>
        </ModalHeader>
        {ownsBusiness && <Callout tone="danger">{errorText(remove.error)}</Callout>}
        <ModalActions>
          <ModalClose asChild>
            <Button disabled={remove.isPending}>{t('profile.deleteBack')}</Button>
          </ModalClose>
          <Button variant="danger-solid" loading={remove.isPending} disabled={ownsBusiness} onClick={confirm}>
            {t('profile.delete')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
