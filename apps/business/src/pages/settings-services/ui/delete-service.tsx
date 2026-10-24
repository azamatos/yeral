import { useMutation } from '@tanstack/react-query'
import type { Menu } from '@yeral/contract/services'
import { localized } from '@yeral/domain/model'
import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { toast } from '@yeral/ui/toast'
import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

type Service = Menu['groups'][number]['services'][number]

/**
 * «Delete service» (B-Services `askDelete`, design §28.6, book Q-210): a service with upcoming bookings asks first
 * («Delete Hair colouring? It has 4 upcoming bookings. They stay as they are; new bookings can’t choose it.»); one
 * without goes at once with «Undo» in its toast (`restoreService`). `ask` starts it; `modal` is the confirm to render.
 */
export function useDeleteService(slug: string): { ask: (service: Service) => void; modal: ReactNode } {
  const t = useTranslations('settings.services.delete')
  const locale = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const remove = useMutation(sdk.settings.deleteService(slug))
  const restore = useMutation(sdk.settings.restoreService(slug))
  const [asking, setAsking] = useState<Service | null>(null)

  const now = (service: Service, undo: boolean) => {
    const name = localized(service.name, locale)
    remove.mutate(service.id, {
      onSuccess: () => {
        setAsking(null)
        if (!undo) return toast(t('deletedKept', { name, n: service.futureBookings }))
        toast(t('deleted', { name }), {
          action: {
            label: t('undo'),
            onClick: () =>
              restore.mutate(service.id, {
                onSuccess: () => toast(t('restored', { name })),
                onError: (error) => toast(errorText(error)),
              }),
          },
        })
      },
      onError: (error) => toast(errorText(error)),
    })
  }

  const name = asking ? localized(asking.name, locale) : ''
  const modal = (
    <Modal open={!!asking} onOpenChange={(open) => !open && !remove.isPending && setAsking(null)}>
      {asking && (
        <ModalContent role="alertdialog">
          <ModalHeader title={t('title', { name })} closeLabel={t('close')} />
          <ModalDescription className="text-n-900">{t('text', { n: asking.futureBookings })}</ModalDescription>
          <ModalActions>
            <Button variant="secondary" autoFocus disabled={remove.isPending} onClick={() => setAsking(null)}>
              {t('cancel')}
            </Button>
            <Button variant="danger-solid" loading={remove.isPending} loadingLabel={t('deleting')} onClick={() => now(asking, false)}>
              {t('confirm')}
            </Button>
          </ModalActions>
        </ModalContent>
      )}
    </Modal>
  )

  return {
    ask: (service) => (service.futureBookings > 0 ? setAsking(service) : now(service, true)),
    modal,
  }
}
