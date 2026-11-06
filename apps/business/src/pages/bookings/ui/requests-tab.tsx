import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { BookingRequest } from '@yeral/contract/requests'
import { openMinutesBetween, type BusinessHours } from '@yeral/domain/hours'
import { DECLINE_REASONS, type DeclineReason } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { BulkBar } from '@yeral/ui/bulk-bar'
import { Button } from '@yeral/ui/button'
import { Checkbox } from '@yeral/ui/checkbox'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { EmptyState } from '@yeral/ui/empty-state'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { useMediaQuery } from '@yeral/ui/media-query'
import { Modal, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { CellNote, Table, TableCell, TableColumnHeader, TableHeader, TableRow } from '@yeral/ui/table'
import { TimerPill } from '@yeral/ui/timer-pill'
import { toast } from '@yeral/ui/toast'
import { Check, Inbox, X } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useJoin } from '@/entities/booking'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

const COLUMNS = '44px minmax(170px,1.3fr) minmax(140px,1.1fr) minmax(100px,.7fr) minmax(170px,1.2fr) minmax(200px,1fr)'

/** Everyone asked, some at once: what landed, and what didn't. */
async function settle<T>(items: readonly T[], run: (item: T) => Promise<unknown>) {
  const results = await Promise.allSettled(items.map(run))
  return results.filter((r) => r.status === 'fulfilled').length
}

/** «Decline 2 requests» (book B-31 step 3): one reason for them all, words with «Another reason», no offered times. */
function BulkDecline({
  count,
  pending,
  onDecline,
  onClose,
}: {
  count: number
  pending: boolean
  onDecline: (reason: DeclineReason, text?: string) => void
  onClose: () => void
}) {
  const t = useTranslations('bookings.requests')
  const reasons = useTranslations('bookingDrawer.decline.reasons')
  const [reason, setReason] = useState<DeclineReason | null>(null)
  const [text, setText] = useState('')
  const words = text.trim()
  const ready = reason !== null && (reason !== 'other' || words.length > 0)
  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent size={480} aria-describedby={undefined} className="gap-4">
        <ModalHeader title={t('declineTitle', { n: count })} closeLabel={t('close')} />
        <ChipRadioGroup
          aria-label={t('reason')}
          value={reason ?? ''}
          onValueChange={(value) => setReason(value as DeclineReason)}
          options={DECLINE_REASONS.map((value) => ({ value, label: reasons(value) }))}
        />
        {reason === 'other' && (
          <Field label={t('otherLabel')}>
            <Textarea maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('back')}
          </Button>
          <Button
            variant="danger-quiet"
            disabled={!ready}
            loading={pending}
            loadingLabel={t('declining')}
            onClick={() => reason && onDecline(reason, reason === 'other' ? words : undefined)}
          >
            {t('decline')}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  )
}

/**
 * The Requests tab (B-Bookings `tab=requests`, book B-30 step 3, B-31): the least time first, the Answer column (the timer,
 * confirm and decline, or who answers), a client's move as «Fri, 16 Oct · 10:00 → Sat, 17 Oct · 11:30», ticks and the
 * BulkBar for those the reader may answer. Decline on a row opens its drawer, where the offers are.
 */
export function RequestsTab({
  slug,
  business,
  specialist,
  picked,
  onOpen,
}: {
  slug: string
  business: BusinessHours | null
  specialist: boolean
  picked?: string
  onOpen: (code: string) => void
}) {
  const t = useTranslations('bookings.requests')
  const b = useTranslations('bookings')
  const fmt = useFmt()
  const locale = useLocale()
  const join = useJoin()
  const sdk = useSdk()
  const errorText = useErrorText()
  const phone = useMediaQuery('(max-width: 767px)')
  const list = useQuery(sdk.requests.list(slug))
  const confirm = useMutation(sdk.requests.confirm(slug))
  const decline = useMutation(sdk.requests.decline(slug))
  const [ticked, setTicked] = useState<readonly string[]>([])
  const [declining, setDeclining] = useState(false)

  const items = list.data?.items ?? []
  const answerable = items.filter((r) => r.canAnswer)
  // a request answered meanwhile counts no more
  const chosen = ticked.filter((code) => answerable.some((r) => r.code === code))
  const when = (date: string, start: number) => b('when', { day: fmt.shortWeekdayDate(date), time: fmt.time(start) })
  const toggle = (code: string) => setTicked(chosen.includes(code) ? chosen.filter((c) => c !== code) : [...chosen, code])

  const confirmOne = (r: BookingRequest) =>
    confirm.mutate(r.code, {
      onSuccess: () => toast(t('confirmed')),
      onError: (error) => toast(errorText(error)),
    })
  const confirmAll = async () => {
    const done = await settle(chosen, (code) => confirm.mutateAsync(code))
    setTicked([])
    toast(t('confirmedMany', { done, of: chosen.length }))
  }
  const declineAll = async (reason: DeclineReason, text?: string) => {
    const done = await settle(chosen, (code) => decline.mutateAsync({ code, reason, ...(text ? { text } : {}) }))
    setTicked([])
    setDeclining(false)
    toast(t('declinedMany', { done, of: chosen.length }))
  }

  if (list.isPending) return null
  if (items.length === 0)
    return (
      <EmptyState
        icon={<Inbox aria-hidden />}
        title={t('emptyTitle')}
        description={t('emptyText')}
        action={
          <Button asChild variant="secondary" size="s">
            <Link to="/w/$slug/calendar" params={{ slug }}>
              {t('openCalendar')}
            </Link>
          </Button>
        }
      />
    )

  const timer = (r: BookingRequest) => (
    <TimerPill
      size="s"
      className="flex-none"
      until={r.holdUntil}
      left={business ? (at: number) => openMinutesBetween(business, at, r.holdUntil) : undefined}
      format={(m) => fmt.duration(m)}
      label={(m) => t('timeLeft', { time: fmt.duration(m) })}
    />
  )
  const services = (r: BookingRequest) =>
    join(
      r.items.map((i) => i.service),
      'plus',
    )
  const time = (r: BookingRequest) =>
    r.from ? (
      <span>
        {when(r.from.date, r.from.start)} {t('arrow')} <b className="font-semibold">{when(r.date, r.start)}</b>
      </span>
    ) : (
      <span>{when(r.date, r.start)}</span>
    )
  const staff = (r: BookingRequest) => [...new Set(r.items.flatMap((i) => i.staff ?? []))].join(b('comma'))

  return (
    <div className="flex flex-col">
      {phone ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((r) => (
            <li key={r.code}>
              <button
                type="button"
                onClick={() => onOpen(r.code)}
                className="flex w-full cursor-pointer flex-col gap-1 rounded-ctl-l border border-n-200 bg-n-0 p-3 text-left focus-visible:shadow-focus focus-visible:outline-none"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-small font-semibold text-n-900">{r.client.name}</span>
                  {timer(r)}
                </span>
                <span className="text-dense text-n-600">{time(r)}</span>
                <span className="truncate text-dense text-n-600">{services(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Table columns={COLUMNS} aria-label={t('table')}>
          <TableHeader>
            <TableColumnHeader>
              <Checkbox
                aria-label={t('tickAll')}
                checked={answerable.length > 0 && chosen.length === answerable.length}
                disabled={answerable.length === 0}
                onChange={() => setTicked(chosen.length === answerable.length ? [] : answerable.map((r) => r.code))}
              />
            </TableColumnHeader>
            <TableColumnHeader>{b('columns.client')}</TableColumnHeader>
            <TableColumnHeader>{b('columns.service')}</TableColumnHeader>
            <TableColumnHeader>{b('columns.specialist')}</TableColumnHeader>
            <TableColumnHeader>{b('columns.time')}</TableColumnHeader>
            <TableColumnHeader>{t('answer')}</TableColumnHeader>
          </TableHeader>
          {items.map((r) => (
            <TableRow key={r.code} selected={picked === r.code || chosen.includes(r.code)}>
              <TableCell>
                {r.canAnswer && (
                  <Checkbox
                    aria-label={t('tick', { name: r.client.name })}
                    checked={chosen.includes(r.code)}
                    onChange={() => toggle(r.code)}
                  />
                )}
              </TableCell>
              <TableCell className="flex-col items-start gap-0.5">
                <button
                  type="button"
                  onClick={() => onOpen(r.code)}
                  className="min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left font-semibold text-n-900 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
                >
                  {r.client.name}
                </button>
                {r.client.phone && <CellNote>{fmt.phone(r.client.phone)}</CellNote>}
              </TableCell>
              <TableCell>{services(r)}</TableCell>
              <TableCell>{staff(r)}</TableCell>
              <TableCell>{time(r)}</TableCell>
              {/* one line (design §5): the timer and the inline ✓ ✕, never stacked */}
              <TableCell className="flex-row flex-nowrap items-center gap-1.5">
                {timer(r)}
                {r.canAnswer ? (
                  <>
                    <Button
                      variant="plain"
                      size="s"
                      iconOnly
                      className="flex-none"
                      aria-label={t('confirmFor', { name: r.client.name })}
                      disabled={r.fits === false}
                      onClick={() => confirmOne(r)}
                    >
                      <Check aria-hidden />
                    </Button>
                    <Button
                      variant="plain"
                      size="s"
                      iconOnly
                      className="flex-none"
                      aria-label={t('declineFor', { name: r.client.name })}
                      onClick={() => onOpen(r.code)}
                    >
                      <X aria-hidden />
                    </Button>
                  </>
                ) : (
                  <CellNote>{t(specialist ? 'answersDesk' : 'answersOwn', { name: staff(r) })}</CellNote>
                )}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
      {chosen.length > 0 && (
        <BulkBar
          count={t('selected', { n: chosen.length })}
          clearLabel={t('clearSelection')}
          onClear={() => setTicked([])}
          aria-label={t('bulk')}
        >
          <Button variant="inverse-ghost" size="s" loading={confirm.isPending} onClick={() => void confirmAll()}>
            {t('confirm')}
          </Button>
          <Button variant="inverse-ghost" size="s" onClick={() => setDeclining(true)}>
            {t('decline')}
          </Button>
          {!specialist && (
            <Button asChild variant="inverse-ghost" size="s">
              <a href={sdk.calendar.exportUrl(slug, { tab: 'upcoming', codes: [...chosen], lang: locale })} download>
                {b('export')}
              </a>
            </Button>
          )}
        </BulkBar>
      )}
      {declining && (
        <BulkDecline
          count={chosen.length}
          pending={decline.isPending}
          onDecline={(reason, text) => void declineAll(reason, text)}
          onClose={() => setDeclining(false)}
        />
      )}
    </div>
  )
}
