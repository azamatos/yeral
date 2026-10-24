import type { BookingsAffectedDetails } from '@yeral/contract/errors'
import { diffDays, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { OptionCard, OptionCardGroup } from '@yeral/ui/option-card'
import { StatusBadge } from '@yeral/ui/status-badge'
import { Check, Clock } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'

export type AffectedChoice = 'keep' | 'cancel'
type Listed = BookingsAffectedDetails['bookings'][number]

/** Words joined as the language joins them: «a · b · c» (`dot`) or «a, b» (`list`). */
export function useJoin() {
  const t = useTranslations('affected')
  return (parts: readonly string[], how: 'dot' | 'list') =>
    parts.filter(Boolean).reduce((a, b) => (a ? t(how === 'dot' ? 'joinDot' : 'joinList', { a, b }) : b), '')
}

/** «5 bookings and 1 request» (`and`) or «5 bookings · 1 request» (the list's label). */
export function useAffectedCount() {
  const t = useTranslations('affected')
  return ({ bookings, requests }: BookingsAffectedDetails['counts'], join: 'and' | 'dot') => {
    const a = bookings ? t('bookings', { n: bookings }) : ''
    const b = requests ? t('requests', { n: requests }) : ''
    return a && b ? t(join === 'and' ? 'joinAnd' : 'joinDot', { a, b }) : a || b
  }
}

/**
 * The bookings a change leaves out (DS-Business AffectedBookingsList, B-Settings `.abl`): a row each, «Today ·
 * 18:00–18:45» over «client · service · specialist», Confirmed, or Pending with the time left to answer. Moves to
 * `entities/booking` once Team's shift and remove flows list them too (COMPONENTS.md), the timer to TimerPill.
 */
export function AffectedBookingsList({ bookings, labelledBy }: { bookings: readonly Listed[]; labelledBy: string }) {
  const t = useTranslations('affected')
  const s = useTranslations('status')
  const fmt = useFmt()
  const join = useJoin()
  const [now] = useState(() => Date.now())
  const day = (date: string) =>
    // today and tomorrow by name, then «Fri, 16 Oct»
    diffDays(date, today(now)) <= 1 ? fmt.relativeDay(date, today(now)) : fmt.dayDate(date)
  return (
    <div role="list" aria-labelledby={labelledBy} className="flex flex-col border-t border-n-200">
      {bookings.map((b) => {
        // a hold already over (not expired yet by the jobs) shows no time
        const left = b.holdUntil !== null && b.holdUntil > now ? fmt.duration(Math.ceil((b.holdUntil - now) / 60_000)) : null
        const who = join(
          [
            b.client ?? t('unnamed'),
            join(
              b.items.map((i) => i.service),
              'list',
            ),
            join(b.staff, 'list'),
          ],
          'dot',
        )
        return (
          <div
            key={b.code}
            role="listitem"
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-n-200 py-2.5 text-small"
          >
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold tabular-nums">{t('when', { day: day(b.date), time: fmt.timeRange(b.start, b.end) })}</span>
              <span className="text-dense text-n-600">{who}</span>
            </span>
            <span className="flex flex-wrap items-center justify-end gap-1.5">
              {b.status === 'confirmed' ? (
                <StatusBadge status="confirmed" icon={<Check strokeWidth={2} />}>
                  {s('confirmed')}
                </StatusBadge>
              ) : (
                <>
                  <StatusBadge status="pending" icon={<Clock strokeWidth={2} />}>
                    {s('pending')}
                  </StatusBadge>
                  {left && (
                    <span
                      role="timer"
                      aria-label={t('left', { time: left })}
                      title={t('left', { time: left })}
                      className="inline-flex h-6 items-center gap-1 rounded-pill border border-st-pending-line bg-st-pending-bg px-2 text-micro font-semibold whitespace-nowrap text-st-pending-ink tabular-nums [&_svg]:size-3"
                    >
                      <Clock aria-hidden strokeWidth={2} />
                      {left}
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

type ModalProps = {
  /** The 409's list; null while nothing waits for a choice. */
  details: BookingsAffectedDetails | null
  lead: string
  saving: boolean
  onSave: (choice: AffectedChoice) => void
  onClose: () => void
}

/**
 * «5 bookings and 1 request fall outside the new hours» (B-Settings, design §28.5 hours, book Q-211): the changed days
 * as the lead, Keep them or Cancel and offer 3 other times, the list, and Save sends the save again with the choice.
 * New bookings follow the new hours either way. Each opening starts on Keep them.
 */
export function HoursAffectedBookings({ details, saving, onClose, ...rest }: ModalProps) {
  return (
    <Modal
      open={details !== null}
      onOpenChange={(next) => {
        if (!next && !saving) onClose()
      }}
    >
      {details && <AffectedBody details={details} saving={saving} onClose={onClose} {...rest} />}
    </Modal>
  )
}

function AffectedBody({ details, lead, saving, onSave, onClose }: ModalProps & { details: BookingsAffectedDetails }) {
  const t = useTranslations('affected')
  const count = useAffectedCount()
  const [choice, setChoice] = useState<AffectedChoice>('keep')
  const labelId = useId()
  return (
    <ModalContent size={560} className="gap-4.5">
      <ModalHeader title={t('hoursTitle', { what: count(details.counts, 'and'), n: details.count })} closeLabel={t('close')}>
        <ModalDescription>{t('hoursLead', { days: lead })}</ModalDescription>
      </ModalHeader>
      <OptionCardGroup value={choice} onValueChange={(v) => setChoice(v as AffectedChoice)} aria-label={t('what')} className="gap-2">
        <OptionCard value="keep" indicator="start" title={t('keep')} caption={t('keepCaption')} />
        <OptionCard value="cancel" indicator="start" title={t('cancel')} caption={t('cancelCaption')} />
      </OptionCardGroup>
      <div className="flex flex-col gap-2">
        <span id={labelId} className="text-n-700 text-label font-semibold">
          {count(details.counts, 'dot')}
        </span>
        <AffectedBookingsList bookings={details.bookings} labelledBy={labelId} />
        {details.count > details.bookings.length && (
          <span className="text-dense text-n-600">{t('more', { n: details.count - details.bookings.length })}</span>
        )}
      </div>
      <p className="m-0 text-dense text-n-600">{t('hoursEither')}</p>
      <ModalActions>
        <Button variant="secondary" disabled={saving} onClick={onClose}>
          {t('back')}
        </Button>
        <Button variant="primary" loading={saving} loadingLabel={t('saving')} onClick={() => onSave(choice)}>
          {t('save')}
        </Button>
      </ModalActions>
    </ModalContent>
  )
}
