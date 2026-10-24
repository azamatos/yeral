import { useMutation } from '@tanstack/react-query'
import type { Menu } from '@yeral/contract/services'
import { localized } from '@yeral/domain/model'
import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { toast } from '@yeral/ui/toast'
import { useRef, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

type Service = Menu['groups'][number]['services'][number]

/**
 * «Delete service» (B-Services `askDelete`, design §28.6, book Q-210): a service with upcoming bookings asks first
 * («Delete Hair colouring? It has 4 upcoming bookings. They stay as they are; new bookings can’t choose it.»); one
 * without goes at once with «Undo» in its toast (`restoreService`). `ask` starts it (`from` takes the focus back when
 * the confirm closes); `onDeleted` hears each one gone; `modal` is the confirm to render. Each delete answers on its
 * own, however many are on their way.
 */
export function useDeleteService(
  slug: string,
  onDeleted: (service: Service) => void,
): { ask: (service: Service, from?: HTMLElement | null) => void; modal: ReactNode } {
  const t = useTranslations('settings.services.delete')
  const locale = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const remove = useMutation(sdk.settings.deleteService(slug))
  const restore = useMutation(sdk.settings.restoreService(slug))
  const [asking, setAsking] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState(false)
  const from = useRef<HTMLElement | null>(null)

  const now = async (service: Service, undo: boolean) => {
    const name = localized(service.name, locale)
    try {
      await remove.mutateAsync(service.id)
    } catch (error) {
      toast(errorText(error))
      return false
    }
    onDeleted(service)
    if (!undo) toast(t('deletedKept', { name, n: service.futureBookings }))
    else
      toast(t('deleted', { name }), {
        action: {
          label: t('undo'),
          onClick: () =>
            void restore
              .mutateAsync(service.id)
              .then(() => toast(t('restored', { name })))
              .catch((error: unknown) => toast(errorText(error))),
        },
      })
    return true
  }

  const confirm = async () => {
    if (!asking) return
    setDeleting(true)
    const done = await now(asking, false)
    setDeleting(false)
    if (done) setAsking(null)
  }

  const name = asking ? localized(asking.name, locale) : ''
  const modal = (
    <Modal open={!!asking} onOpenChange={(open) => !open && !deleting && setAsking(null)}>
      {asking && (
        <ModalContent
          role="alertdialog"
          onCloseAutoFocus={(e) => {
            // opened from a menu or the drawer, not a trigger: the focus goes back where it came from
            const to = from.current
            if (to?.isConnected) {
              e.preventDefault()
              to.focus()
            }
          }}
        >
          <ModalHeader title={t('title', { name })} closeLabel={t('close')} />
          <ModalDescription className="text-n-900">{t('text', { n: asking.futureBookings })}</ModalDescription>
          <ModalActions>
            <Button variant="secondary" autoFocus disabled={deleting} onClick={() => setAsking(null)}>
              {t('cancel')}
            </Button>
            <Button variant="danger-solid" loading={deleting} loadingLabel={t('deleting')} onClick={() => void confirm()}>
              {t('confirm')}
            </Button>
          </ModalActions>
        </ModalContent>
      )}
    </Modal>
  )

  return {
    ask: (service, opener) => {
      from.current = opener ?? null
      if (service.futureBookings > 0) setAsking(service)
      else void now(service, true)
    },
    modal,
  }
}
