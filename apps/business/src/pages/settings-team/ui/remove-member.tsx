import { useMutation } from '@tanstack/react-query'
import { bookingsAffectedDetailsSchema, type BookingsAffectedDetails } from '@yeral/contract/errors'
import type { TeamMember } from '@yeral/contract/team'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Modal, ModalActions, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { OptionCard, OptionCardGroup } from '@yeral/ui/option-card'
import { Select } from '@yeral/ui/select'
import { toast } from '@yeral/ui/toast'
import { ArrowRight } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AffectedBookingsList, useAffectedCount, useJoin, type AffectedBooking } from '@/entities/booking'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { leftAhead } from '../model/member'

type Choice = 'move' | 'keep' | 'cancel'
type RowChoice = 'keep' | 'cancel'

function useRemove(slug: string) {
  const sdk = useSdk()
  return useMutation(sdk.team.remove(slug))
}

/**
 * «Remove … from the team?» (B-Team `rm`, design §28.4, book B-50): they lose access and leave the client site; past
 * bookings and reviews stay. The first Remove asks the api, which removes someone with nothing ahead at once and
 * otherwise lists their bookings (409); then the owner picks: Move to another specialist (only colleagues who do the
 * services are listed; a booking they can't take gets its own Keep it or Cancel and offer 3 other times), Keep them,
 * or Cancel and offer 3 other times, and Remove sends it again with the choice. `mode="left"` («Someone left» →
 * Choose, B-Team `rm` left): «Who takes Aýna’s bookings?» for someone who left by themself, their bookings asked for at
 * once, the same choices, and Save. Moves to `features/remove-staff` (COMPONENTS.md) when a second page uses it.
 */
export function RemoveMember({
  slug,
  member,
  business,
  mode = 'remove',
  open,
  onOpenChange,
  onRemoved,
}: {
  slug: string
  member: TeamMember
  business: string
  mode?: 'remove' | 'left'
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemoved: () => void
}) {
  const remove = useRemove(slug)
  return (
    // nothing closes it while the removal runs: the answer, or the list it asks about, needs the window
    <Modal open={open} onOpenChange={(next) => (next || !remove.isPending) && onOpenChange(next)}>
      {open && (
        <RemoveBody
          member={member}
          business={business}
          mode={mode}
          remove={remove}
          onCancel={() => onOpenChange(false)}
          onRemoved={onRemoved}
        />
      )}
    </Modal>
  )
}

function RemoveBody({
  member: m,
  business,
  mode,
  remove,
  onCancel,
  onRemoved,
}: {
  member: TeamMember
  business: string
  mode: 'remove' | 'left'
  remove: ReturnType<typeof useRemove>
  onCancel: () => void
  onRemoved: () => void
}) {
  const t = useTranslations('settings.team.remove')
  const a = useTranslations('affected')
  const fmt = useFmt()
  const errorText = useErrorText()
  const count = useAffectedCount()
  const join = useJoin()
  const labelId = useId()
  const [details, setDetails] = useState<BookingsAffectedDetails | null>(null)
  const [choice, setChoice] = useState<Choice>('keep')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<Record<string, RowChoice>>({})
  const [now] = useState(() => Date.now())
  const left = mode === 'left'

  // the colleagues who do any of these bookings' services, each once
  const colleagues = [
    ...new Map((details?.bookings ?? []).flatMap((b) => b.colleagues ?? []).map((c) => [c.staffId, c.name])).entries(),
  ].map(([staffId, name]) => ({ staffId, name }))
  // a move needs every booking listed (the api lists 50): one past the list would get no choice of its own
  const movable = (d: BookingsAffectedDetails) => d.count === d.bookings.length && d.bookings.some((b) => b.colleagues?.length)
  const toName = colleagues.find((c) => c.staffId === to)?.name ?? ''
  const takes = (b: AffectedBooking) => !!b.colleagues?.some((c) => c.staffId === to)
  // what this person does in it (a shared booking's other parts stay with their own specialists)
  const services = (b: AffectedBooking) => {
    const own = b.items.filter((i) => i.staffId === m.id)
    return join(
      (own.length ? own : b.items).map((i) => i.service),
      'list',
    )
  }
  const when = (b: AffectedBooking) => a('when', { day: fmt.relativeShortDate(b.date, today(now)), time: fmt.timeRange(b.start, b.end) })

  const send = async () => {
    try {
      const result = details
        ? await remove.mutateAsync({
            staffId: m.id,
            affected: choice,
            // every row says what happens if the colleague can't take it then (busy, away): Keep it unless changed
            ...(choice === 'move' ? { to, rows: details.bookings.map((b) => ({ code: b.code, affected: rows[b.code] ?? 'keep' })) } : {}),
          })
        : await remove.mutateAsync({ staffId: m.id })
      const parts = [
        result.moved ? t('moved', { n: result.moved, name: toName }) : '',
        result.cancelled ? t('cancelled', { n: result.cancelled }) : '',
        result.kept ? t('kept', { n: result.kept }) : '',
      ]
      const sum = join(parts, 'list')
      const told = result.moved || result.cancelled ? t('notified', { sum }) : sum
      if (left) toast(sum ? t('settledWith', { name: m.name, sum: told }) : t('settled', { name: m.name }))
      else toast(sum ? t('removedWith', { name: m.name, sum: told }) : t('removed', { name: m.name }))
      onRemoved()
    } catch (error) {
      const listed = isApiError(error, 'bookings_affected') && bookingsAffectedDetailsSchema.safeParse(error.details)
      if (listed && listed.success) {
        setDetails(listed.data)
        // moving is picked first when someone else does these services
        const first = movable(listed.data) ? listed.data.bookings.flatMap((b) => b.colleagues ?? [])[0] : undefined
        setChoice(first ? 'move' : 'keep')
        setTo(first?.staffId ?? '')
      } else toast(errorText(error))
    }
  }

  // someone who left: their bookings are what the window is for, asked for as it opens
  const asked = useRef(false)
  useEffect(() => {
    if (!left || asked.current) return
    asked.current = true
    void send()
  })

  return (
    <ModalContent size={560} className="gap-4.5">
      <ModalHeader title={left ? t('leftTitle', { name: m.name }) : t('title', { name: m.name })} closeLabel={a('close')}>
        <ModalDescription>
          {left
            ? t('leftLead', {
                name: m.name,
                business,
                what: count(leftAhead(m), 'and'),
              })
            : t('lead', { name: m.name, business })}
        </ModalDescription>
      </ModalHeader>
      {details && (
        <>
          <OptionCardGroup value={choice} onValueChange={(v) => setChoice(v as Choice)} aria-label={t('what')} className="gap-2">
            {movable(details) && <OptionCard value="move" indicator="start" title={t('move')} caption={t('moveCaption')} />}
            <OptionCard value="keep" indicator="start" title={a('keep')} caption={t('keepCaption', { name: m.name })} />
            <OptionCard value="cancel" indicator="start" title={a('cancel')} caption={a('cancelCaption')} />
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
                          {t('movesTo', { name: toName })}
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
                            aria-label={t('rowAria', { client: b.client ?? a('unnamed'), when: when(b) })}
                            value={rows[b.code] ?? 'keep'}
                            onChange={(e) => setRows((r) => ({ ...r, [b.code]: e.target.value === 'cancel' ? 'cancel' : 'keep' }))}
                          >
                            <option value="keep">{t('keepIt')}</option>
                            <option value="cancel">{a('cancel')}</option>
                          </Select>
                        </span>
                      )
                  : undefined
              }
            />
            {details.count > details.bookings.length && (
              <span className="text-dense text-n-600">{a('more', { n: details.count - details.bookings.length })}</span>
            )}
          </div>
        </>
      )}
      <ModalActions>
        <Button variant="secondary" disabled={remove.isPending} onClick={onCancel}>
          {a('back')}
        </Button>
        {left ? (
          // before the bookings are listed (the first ask failed), Save asks again
          <Button variant="primary" loading={remove.isPending} loadingLabel={t('saving')} onClick={() => void send()}>
            {t('save')}
          </Button>
        ) : (
          <Button variant="danger-solid" loading={remove.isPending} loadingLabel={t('removing')} onClick={() => void send()}>
            {t('confirm', { name: m.name })}
          </Button>
        )}
      </ModalActions>
    </ModalContent>
  )
}
