import { useQuery } from '@tanstack/react-query'
import type { BookingRequest } from '@yeral/contract/requests'
import { currentBusinessDate, type BusinessHours } from '@yeral/domain/hours'
import { MAX_ALTERNATIVES } from '@yeral/domain/lifecycle'
import type { DeclineReason } from '@yeral/domain/model'
import { diffDays, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { Textarea } from '@yeral/ui/input'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { Spinner } from '@yeral/ui/spinner'
import { Switch } from '@yeral/ui/switch'
import { TimeSlots, type SlotGroup } from '@yeral/ui/time-slots'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useJoin } from '@/entities/booking'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

/** What a decline sends (book B-20): the reason, its words, the times offered. */
export type DeclineInput = {
  reason: DeclineReason
  text?: string
  offers?: { date: string; start: number; staffId: string }[]
}

/** «Another reason» in words, as the board's field takes it (the client sees it). */
const REASON_MAX = 200

/**
 * «Decline the request» (B-Calendar `.mdl` decline, DS-Business DeclineRequestModal, book B-20): the reason the client
 * sees (another one in words), and for a new request «Offer another time» with up to 3 of the nearest free times,
 * searched as the decline checks them (`freeTimes` with `offer`). A client's move is declined with the reason only:
 * «Decline the new time», the booking stays at its time (B-21).
 */
export function DeclineModal({
  slug,
  request: r,
  now,
  business,
  pending,
  send,
  onOpenChange,
  onDeclined,
  onRefused,
}: {
  slug: string
  request: BookingRequest
  now: number
  /** The business's hours: «Today» is its business day (one open past midnight is still yesterday's). */
  business: BusinessHours | null
  /** A decline on its way: the modal stays until it lands. */
  pending: boolean
  /** The drawer sends it: its answer lands there even after this modal is gone. */
  send: (input: DeclineInput, done: { onSuccess: () => void; onError: (error: unknown) => void }) => void
  onOpenChange: (open: boolean) => void
  /** Declined: the words for its toast («Request declined · the client sees the reason and 2 other times»). */
  onDeclined: (toast: string) => void
  /** Refused (the request gone, a time taken): the drawer reads the requests again. */
  onRefused: () => void
}) {
  const t = useTranslations('bookingDrawer.decline')
  const fmt = useFmt()
  const join = useJoin()
  const sdk = useSdk()
  const errorText = useErrorText()
  const id = useId()
  const move = r.kind === 'move'
  const [reason, setReason] = useState<DeclineReason | null>(null)
  const [text, setText] = useState('')
  const [offer, setOffer] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [failed, setFailed] = useState<string | null>(null)
  const services = r.items.flatMap((i) => (i.serviceId ? [i.serviceId] : []))
  // times are offered for a new request whose services are still on the menu (the search needs them)
  const canOffer = !move && services.length > 0
  const searching = offer && canOffer
  const free = useQuery({ ...sdk.calendar.freeTimes(slug, { services, offer: r.code }), enabled: searching })
  const own = r.items.find((i) => i.staffId)?.staffId
  // the declined time itself is free to the search (its own hold): not offered back
  const nearest = (free.data?.nearest ?? []).filter((n) => !(n.date === r.date && n.start === r.start && n.staffId === own))
  const reasons = (['slot_busy', 'no_staff', ...(move ? [] : ['cannot_do' as const]), 'other'] as const).map((value) => ({
    value,
    label: t(`reasons.${value}`),
  }))
  const words = text.trim()
  const ready = reason !== null && (reason !== 'other' || words.length > 0)
  const day = business ? currentBusinessDate(business, now) : today(now)
  const valueOf = (n: (typeof nearest)[number]) => `${n.date}|${n.start}|${n.staffId}`
  // the picks still offered: one gone since (taken, read again) counts no more
  const values = picked.filter((v) => nearest.some((n) => valueOf(n) === v))
  const groups: SlotGroup[] = [...new Set(nearest.map((n) => n.date))].map((date) => {
    const days = diffDays(date, day)
    return {
      label: days === 0 ? t('today') : days === 1 ? t('tomorrow') : fmt.shortWeekdayDate(date),
      slots: nearest.filter((n) => n.date === date).map((n) => ({ value: valueOf(n), label: fmt.time(n.start) })),
    }
  })
  const offers = searching ? nearest.filter((n) => values.includes(valueOf(n))) : []
  const when = (date: string, start: number) => t('when', { date: fmt.shortWeekdayDate(date), time: fmt.time(start) })
  const context = join(
    [
      r.client.name,
      join(
        r.items.map((i) => i.service),
        'plus',
      ),
      move && r.from
        ? t('moveFromTo', { from: when(r.from.date, r.from.start), to: when(r.date, r.start) })
        : t('when', { date: fmt.weekdayDate(r.date), time: fmt.timeRange(r.start, r.end) }),
    ],
    'dot',
  )

  const submit = () => {
    if (!reason || !ready) return
    setFailed(null)
    send(
      {
        reason,
        ...(reason === 'other' ? { text: words } : {}),
        ...(offers.length ? { offers: offers.map((o) => ({ date: o.date, start: o.start, staffId: o.staffId })) } : {}),
      },
      {
        onSuccess: () => onDeclined(move ? t('declinedMove') : t('declined', { n: offers.length })),
        // a time taken meanwhile, the request gone: said here, the times read again
        onError: (error) => {
          setFailed(errorText(error))
          onRefused()
          if (searching) void free.refetch()
        },
      },
    )
  }

  return (
    <Modal open onOpenChange={onOpenChange}>
      <ModalContent size={480}>
        <ModalHeader title={move ? t('titleMove') : t('title')} closeLabel={t('close')}>
          <ModalDescription>{move ? t('leadMove') : t('lead')}</ModalDescription>
          <span className="text-dense text-n-600">{context}</span>
        </ModalHeader>
        <div className="flex flex-col gap-2.5">
          <span id={`${id}-reason`} className="text-small font-medium text-n-900">
            {t('reason')}
          </span>
          <ChipRadioGroup
            aria-labelledby={`${id}-reason`}
            options={reasons}
            value={reason ?? ''}
            onValueChange={(value) => setReason(value as DeclineReason)}
          />
          {reason === 'other' && (
            <Textarea
              aria-label={t('otherLabel')}
              placeholder={t('otherPlaceholder')}
              value={text}
              maxLength={REASON_MAX}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </div>
        {canOffer && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <span className="flex flex-col gap-0.5">
                <span id={`${id}-offer`} className="text-small font-medium text-n-900">
                  {t('offer')}
                </span>
                <span className="text-dense text-n-600">{t('offerCaption')}</span>
              </span>
              <Switch aria-labelledby={`${id}-offer`} checked={offer} onCheckedChange={setOffer} />
            </div>
            {offer &&
              (free.isLoading ? (
                <Spinner label={t('loadingTimes')} />
              ) : nearest.length ? (
                <TimeSlots
                  size="s"
                  groups={groups}
                  selectionMode="multiple"
                  max={MAX_ALTERNATIVES}
                  values={values}
                  onValuesChange={setPicked}
                  counter={(n, max) => (n ? t('picked', { n, max }) : t('pickUpTo', { max }))}
                />
              ) : (
                <p className="m-0 text-dense text-n-600">{free.isError ? errorText(free.error) : t('noTimes')}</p>
              ))}
          </div>
        )}
        {failed && (
          <p role="alert" className="m-0 text-dense text-danger-ink">
            {failed}
          </p>
        )}
        <ModalActions>
          <Button variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
            {t('back')}
          </Button>
          <Button variant="danger-solid" disabled={!ready} loading={pending} onClick={submit}>
            {t('decline')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
