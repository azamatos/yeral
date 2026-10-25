import { useMutation } from '@tanstack/react-query'
import { bookingsAffectedDetailsSchema, type BookingsAffectedDetails } from '@yeral/contract/errors'
import type { TeamMember } from '@yeral/contract/team'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { OptionCard, OptionCardGroup } from '@yeral/ui/option-card'
import { Select } from '@yeral/ui/select'
import { toast } from '@yeral/ui/toast'
import { ArrowRight } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AffectedBookingsList, useAffectedCount, useJoin, type AffectedBooking } from '@/entities/booking'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

type Choice = 'move' | 'keep' | 'cancel'
type RowChoice = 'keep' | 'cancel'

/**
 * «Remove … from the team?» (B-Team `rm`, design §28.4, book B-50): they lose access and leave the client site; past
 * bookings and reviews stay. The first Remove asks the api, which removes someone with nothing ahead at once and
 * otherwise lists their bookings (409); then the owner picks: Move to another specialist (only colleagues who do the
 * services are listed; a booking they can't take gets its own Keep it or Cancel and offer 3 other times), Keep them,
 * or Cancel and offer 3 other times, and Remove sends it again with the choice.
 */
export function RemoveMember({
  slug,
  member,
  business,
  open,
  onOpenChange,
  onRemoved,
}: {
  slug: string
  member: TeamMember
  business: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemoved: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onOpenChange={(next) => (next || !busy) && onOpenChange(next)}>
      {open && (
        <RemoveBody
          slug={slug}
          member={member}
          business={business}
          onBusy={setBusy}
          onCancel={() => onOpenChange(false)}
          onRemoved={onRemoved}
        />
      )}
    </Modal>
  )
}

function RemoveBody({
  slug,
  member: m,
  business,
  onBusy,
  onCancel,
  onRemoved,
}: {
  slug: string
  member: TeamMember
  business: string
  onBusy: (busy: boolean) => void
  onCancel: () => void
  onRemoved: () => void
}) {
  const t = useTranslations('settings.team.remove')
  const sdk = useSdk()
  const errorText = useErrorText()
  const count = useAffectedCount()
  const join = useJoin()
  const labelId = useId()
  const remove = useMutation(sdk.team.remove(slug))
  const [details, setDetails] = useState<BookingsAffectedDetails | null>(null)
  const [choice, setChoice] = useState<Choice>('keep')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<Record<string, RowChoice>>({})

  // the colleagues who do any of these bookings' services, each once
  const colleagues = [
    ...new Map((details?.bookings ?? []).flatMap((b) => b.colleagues ?? []).map((c) => [c.staffId, c.name])).entries(),
  ].map(([staffId, name]) => ({ staffId, name }))
  const toName = colleagues.find((c) => c.staffId === to)?.name ?? ''
  const takes = (b: AffectedBooking) => !!b.colleagues?.some((c) => c.staffId === to)
  const services = (b: AffectedBooking) =>
    join(
      b.items.map((i) => i.service),
      'list',
    )

  const send = async () => {
    onBusy(true)
    try {
      const result = details
        ? await remove.mutateAsync({
            staffId: m.id,
            affected: choice,
            ...(choice === 'move'
              ? {
                  to,
                  rows: details.bookings.filter((b) => !takes(b)).map((b) => ({ code: b.code, affected: rows[b.code] ?? 'keep' })),
                }
              : {}),
          })
        : await remove.mutateAsync({ staffId: m.id })
      const parts = [
        result.moved ? t('moved', { n: result.moved, name: toName }) : '',
        result.cancelled ? t('cancelled', { n: result.cancelled }) : '',
        result.kept ? t('kept', { n: result.kept }) : '',
      ]
      const sum = join(parts, 'list')
      toast(
        sum
          ? t('removedWith', { name: m.name, sum: result.moved || result.cancelled ? t('notified', { sum }) : sum })
          : t('removed', { name: m.name }),
      )
      onBusy(false)
      onRemoved()
    } catch (error) {
      onBusy(false)
      const listed = isApiError(error, 'bookings_affected') && bookingsAffectedDetailsSchema.safeParse(error.details)
      if (listed && listed.success) {
        setDetails(listed.data)
        // moving is offered only when someone else does these services
        const first = listed.data.bookings.flatMap((b) => b.colleagues ?? [])[0]
        setChoice(first ? 'move' : 'keep')
        setTo(first?.staffId ?? '')
      } else toast(errorText(error))
    }
  }

  return (
    <ModalContent size={560} className="gap-4.5">
      <ModalHeader title={t('title', { name: m.name })} closeLabel={t('close')}>
        <ModalDescription>{t('lead', { name: m.name, business })}</ModalDescription>
      </ModalHeader>
      {details && (
        <>
          <OptionCardGroup value={choice} onValueChange={(v) => setChoice(v as Choice)} aria-label={t('what')} className="gap-2">
            {colleagues.length > 0 && <OptionCard value="move" indicator="start" title={t('move')} caption={t('moveCaption')} />}
            <OptionCard value="keep" indicator="start" title={t('keep')} caption={t('keepCaption', { name: m.name })} />
            <OptionCard value="cancel" indicator="start" title={t('cancel')} caption={t('cancelCaption')} />
          </OptionCardGroup>
          {/* the card is a radio button: the list of colleagues sits under the cards, not inside one */}
          {choice === 'move' && (
            <span className="-mt-2 flex flex-col gap-1.5">
              <span id={`${labelId}-to`} className="text-dense font-semibold text-n-900">
                {t('to')}
              </span>
              <Select
                size="m"
                className="w-full max-w-70"
                aria-labelledby={`${labelId}-to`}
                aria-describedby={`${labelId}-to-cap`}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              >
                {colleagues.map((c) => (
                  <option key={c.staffId} value={c.staffId}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <span id={`${labelId}-to-cap`} className="text-dense text-n-600">
                {t('toCaption')}
              </span>
            </span>
          )}
          <div className="flex flex-col gap-2">
            <span id={labelId} className="text-label font-semibold text-n-600">
              {count(details.counts, 'dot')}
            </span>
            <AffectedBookingsList
              bookings={details.bookings}
              labelledBy={labelId}
              outcome={
                choice === 'move'
                  ? (b) =>
                      takes(b) ? (
                        <span className="col-span-2 inline-flex items-center gap-1.5 text-dense font-semibold text-a-600">
                          <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
                          {toName}
                        </span>
                      ) : (
                        <span className="col-span-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-dense text-n-600">
                            {b.colleagues?.length
                              ? t('doesnt', { name: toName, services: services(b) })
                              : t('nobody', { services: services(b) })}
                          </span>
                          <Select
                            size="s"
                            className="w-56"
                            aria-label={t('rowAria', { client: b.client ?? t('unnamed') })}
                            value={rows[b.code] ?? 'keep'}
                            onChange={(e) => setRows((r) => ({ ...r, [b.code]: e.target.value === 'cancel' ? 'cancel' : 'keep' }))}
                          >
                            <option value="keep">{t('keepIt')}</option>
                            <option value="cancel">{t('cancel')}</option>
                          </Select>
                        </span>
                      )
                  : undefined
              }
            />
            {details.count > details.bookings.length && (
              <span className="text-dense text-n-600">{t('more', { n: details.count - details.bookings.length })}</span>
            )}
          </div>
        </>
      )}
      <ModalActions>
        <Button variant="secondary" disabled={remove.isPending} onClick={onCancel}>
          {t('back')}
        </Button>
        <Button variant="danger-solid" loading={remove.isPending} loadingLabel={t('removing')} onClick={() => void send()}>
          {t('confirm', { name: m.name })}
        </Button>
      </ModalActions>
    </ModalContent>
  )
}
