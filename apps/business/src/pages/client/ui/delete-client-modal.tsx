import { useMutation } from '@tanstack/react-query'
import type { BusinessHours } from '@yeral/domain/hours'
import type { ClientCard } from '@yeral/contract/clients'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { toast } from '@yeral/ui/toast'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { aheadOf } from '../model/card'
import { useWhat } from '../model/use-what'
import { BookingLink } from './booking-link'
import { Caption } from './card-section'
import { AnswerTimer, BookingStatus } from './client-bookings'

/**
 * Delete a client (B-Client `modal`, book B-36, Q-208): the two sentences of what goes and what stays, or, with bookings
 * ahead or requests waiting, those listed with a link each and no way to delete yet. The list's menu opens it here.
 */
export function DeleteClientModal({
  slug,
  card,
  now,
  business,
  onDeleted,
  onClose,
}: {
  slug: string
  card: ClientCard
  now: number
  business: BusinessHours | null
  onDeleted: () => void
  onClose: () => void
}) {
  const t = useTranslations('clientCard.delete')
  const clients = useTranslations('clients')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const what = useWhat()
  const remove = useMutation(sdk.clients.remove(slug))
  const name = card.name ?? clients('unnamed')
  const { bookings, requests } = aheadOf(card.upcoming)
  const blocked = bookings + requests > 0

  // the card reads back as gone while this runs and closes the modal, so the next step isn't the modal's own
  const confirm = () =>
    remove.mutateAsync(card.id).then(
      () => {
        toast(t('done'))
        onDeleted()
      },
      (error: unknown) => toast(errorText(error)),
    )

  const lead = !blocked
    ? t('lead', { name })
    : bookings && requests
      ? t('leadBoth', { name, bookings, requests })
      : bookings
        ? t('leadBookings', { name, bookings })
        : t('leadRequests', { name, requests })

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent size={480} className="gap-4">
        <ModalHeader title={blocked ? t('titleBlocked') : t('title')} closeLabel={t('close')}>
          <ModalDescription>{lead}</ModalDescription>
        </ModalHeader>
        {blocked ? (
          <>
            <ul aria-label={t('list', { bookings, requests })} className="m-0 flex list-none flex-col gap-1 p-0">
              {card.upcoming.map((b) => (
                <li key={b.code}>
                  <BookingLink
                    slug={slug}
                    booking={b}
                    className="flex items-center justify-between gap-3 rounded-m border border-n-200 p-3 text-small text-n-900 no-underline hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold">
                        {t('when', { day: fmt.relativeShortDate(b.date, today(now)), time: fmt.timeRange(b.start, b.end) })}
                      </span>
                      <Caption>{what(b)}</Caption>
                    </span>
                    <span className="flex flex-none flex-wrap items-center justify-end gap-2">
                      <BookingStatus status={b.status} />
                      {b.status === 'pending' && b.holdUntil !== null && <AnswerTimer until={b.holdUntil} business={business} />}
                    </span>
                  </BookingLink>
                </li>
              ))}
            </ul>
            <ModalActions>
              <Button variant="secondary" onClick={onClose}>
                {t('close')}
              </Button>
            </ModalActions>
          </>
        ) : (
          <ModalActions>
            <Button variant="secondary" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button variant="danger-solid" loading={remove.isPending} loadingLabel={t('deleting')} onClick={() => void confirm()}>
              {t('confirm')}
            </Button>
          </ModalActions>
        )}
      </ModalContent>
    </Modal>
  )
}
