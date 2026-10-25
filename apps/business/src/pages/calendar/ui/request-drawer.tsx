import { useMutation, useQuery } from '@tanstack/react-query'
import type { BookingRequest as Request } from '@yeral/contract/requests'
import { openMinutesBetween, openState, type BusinessHours } from '@yeral/domain/hours'
import { addDays, diffDays, localOf, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@yeral/ui/drawer'
import { KeyValueList } from '@yeral/ui/key-value'
import { Pill } from '@yeral/ui/pill'
import { Quote } from '@yeral/ui/quote'
import { Spinner } from '@yeral/ui/spinner'
import { StatusBadge } from '@yeral/ui/status-badge'
import { toast } from '@yeral/ui/toast'
import { ArrowLeftRight, Clock, Globe, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { BOOKING_STATUS_ICON, useJoin } from '@/entities/booking'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { DeclineModal } from './decline-modal'

/**
 * The request drawer (B-Calendar `.drw` «Request», DS-Business BookingDrawer `mode="request"`, book B-19): the request
 * `code` from the address, the waiting ones most urgent first with a pager «1 / 3». The status and «Online request»,
 * the time left to answer and when it runs out (counted while the business is open), the client (visits or «New
 * client», no-shows, the notes shown when they book), the details and the client's note. Confirm, then a toast with
 * «Next request» while more wait; someone who may not answer reads who does. A request answered elsewhere or run out
 * while open says so.
 */
export function RequestDrawer({
  slug,
  code,
  now,
  business,
  onGo,
  onAnswered,
  onClose,
}: {
  slug: string
  code: string
  now: number
  /** The business's hours (the owner's and admins'): the timer counts only while it's open. Null: the clock. */
  business: BusinessHours | null
  /** Open another request on its day (the pager, «Next request»; the toast's works from any page). */
  onGo: (request: Pick<Request, 'code' | 'date'>, replace?: boolean) => void
  /** This request was answered: the drawer closes if it's still the one open. */
  onAnswered: (code: string) => void
  onClose: () => void
}) {
  const t = useTranslations('calendar.request')
  const sdk = useSdk()
  const list = useQuery(sdk.requests.list(slug))
  const queue = list.data?.items ?? []
  const at = queue.findIndex((r) => r.code === code)
  const request = queue[at]
  const confirm = useMutation(sdk.requests.confirm(slug))
  const errorText = useErrorText()
  const fmt = useFmt()
  const join = useJoin()
  // the pager stays while an answer is on its way: the drawer closes on the request it was for
  const answering = confirm.isPending
  const go = (r: Request | undefined) => r && !answering && onGo(r)
  // the decline modal over the drawer, for the request it opened on
  const [declining, setDeclining] = useState<Request | null>(null)
  // here, not in the modal: its answer still lands when the request has left the list (the sdk reads it again first)
  const decline = useMutation(sdk.requests.decline(slug))
  // the modal stays while its decline is on its way; a request gone meanwhile (answered elsewhere, run out) closes it
  const declineOpen = !!declining && (decline.isPending || queue.some((o) => o.code === declining.code))
  /** Answered: the drawer closes on it, and the toast offers the next one while more wait. */
  const answered = (r: Request, words: string) => {
    onAnswered(r.code)
    const next = queue.find((o) => o.code !== r.code)
    toast(words, next ? { action: { label: t('nextRequest'), onClick: () => onGo(next, false) } } : {})
  }

  const answer = (r: Request) => {
    confirm.mutate(r.code, {
      onSuccess: () => {
        const when = t('when', { date: fmt.shortWeekdayDate(r.date), time: fmt.time(r.start) })
        answered(r, r.kind === 'move' ? t('movedTo', { when }) : t('confirmed'))
      },
      onError: (error) => {
        toast(errorText(error))
        void list.refetch()
      },
    })
  }

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()} scrim="auto">
      <DrawerContent>
        <DrawerHeader
          title={request?.kind === 'move' ? t('titleMove') : t('title')}
          closeLabel={t('close')}
          pager={
            request && queue.length > 1
              ? {
                  position: t('position', { n: at + 1, total: queue.length }),
                  previous: { label: t('previous'), onClick: () => go(queue[at - 1]), disabled: at === 0 || answering },
                  next: { label: t('next'), onClick: () => go(queue[at + 1]), disabled: at === queue.length - 1 || answering },
                }
              : undefined
          }
        />
        {request ? (
          <RequestBody request={request} now={now} business={business} />
        ) : list.isPending ? (
          <DrawerBody className="items-center justify-center">
            <Spinner label={t('loading')} />
          </DrawerBody>
        ) : (
          <DrawerBody>
            {/* answered by someone else, or its time ran out (book B-19, B-22) */}
            <Callout tone="neutral" live>
              {list.isError ? errorText(list.error) : t('gone')}
            </Callout>
          </DrawerBody>
        )}
        {request ? (
          request.canAnswer ? (
            <DrawerFooter>
              <Button variant="secondary" disabled={answering} onClick={() => setDeclining(request)}>
                {t('decline')}
              </Button>
              <Button variant="primary" onClick={() => answer(request)} loading={answering && confirm.variables === request.code}>
                {request.kind === 'move' ? t('confirmMove') : t('confirm')}
              </Button>
            </DrawerFooter>
          ) : (
            <DrawerFooter>
              <p className="m-0 text-dense text-n-600">{viewOnly(request)}</p>
            </DrawerFooter>
          )
        ) : (
          !list.isPending &&
          queue[0] && (
            <DrawerFooter>
              <Button variant="secondary" onClick={() => go(queue[0])}>
                {t('nextRequest')}
              </Button>
            </DrawerFooter>
          )
        )}
      </DrawerContent>
      {declining && declineOpen && (
        <DeclineModal
          slug={slug}
          request={declining}
          now={now}
          business={business}
          pending={decline.isPending}
          send={(input, done) => decline.mutate({ code: declining.code, ...input }, done)}
          onOpenChange={(open) => !open && !decline.isPending && setDeclining(null)}
          onDeclined={(words) => {
            setDeclining(null)
            answered(declining, words)
          }}
          onRefused={() => void list.refetch()}
        />
      )}
    </Drawer>
  )

  /** Who answers it, for someone who may not: the owner and admins, or its specialists (B-Calendar `whoAnswers`). */
  function viewOnly(r: Request) {
    const names = [...new Set(r.items.flatMap((i) => (i.staff ? [i.staff] : [])))]
    return r.answeredBy === 'specialist' && names.length
      ? t('viewOnlyOwn', { n: names.length, names: join(names, 'list') })
      : t('viewOnlyDesk')
  }
}

/** What the drawer shows of one request. */
function RequestBody({ request: r, now, business }: { request: Request; now: number; business: BusinessHours | null }) {
  const t = useTranslations('calendar.request')
  const s = useTranslations('status')
  const fmt = useFmt()
  const join = useJoin()
  const move = r.kind === 'move'
  const day = today(now)
  // a time in a sentence: «09:30», «09:30 tomorrow», «09:30 on Mon, 27 Oct»
  const at = (date: string, minute: number) => {
    const days = diffDays(date, day)
    return t('at', {
      when: days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'other',
      time: fmt.time(minute),
      date: fmt.shortWeekdayDate(date),
    })
  }
  const until = localOf(r.holdUntil)
  const runsOut = at(until.date, until.min)
  // closed now: the timer waits for the opening; it runs out at that time instead of counting down
  const state = business ? openState(business, now) : null
  const closed = state !== null && !state.open
  const left = Math.max(0, Math.ceil(business ? openMinutesBetween(business, now, r.holdUntil) : (r.holdUntil - now) / 60_000))
  const services = join(
    r.items.map((i) => i.service),
    'plus',
  )
  const staff = join([...new Set(r.items.flatMap((i) => (i.staff ? [i.staff] : [])))], 'list')
  const when = (date: string, start: number, end: number) => t('when', { date: fmt.weekdayDate(date), time: fmt.timeRange(start, end) })
  const Pending = BOOKING_STATUS_ICON.pending
  const Confirmed = BOOKING_STATUS_ICON.confirmed

  return (
    <DrawerBody>
      <div className="flex flex-wrap items-center gap-3">
        {move ? (
          <>
            <StatusBadge status="confirmed" icon={<Confirmed aria-hidden strokeWidth={2} className="size-3.5" />}>
              {s('confirmed')}
            </StatusBadge>
            <Pill tone="warning" icon={<ArrowLeftRight aria-hidden />} className="border-dashed bg-n-0">
              {t('moveTag')}
            </Pill>
          </>
        ) : (
          <StatusBadge status="pending" icon={<Pending aria-hidden strokeWidth={2} className="size-3.5" />}>
            {s('pending')}
          </StatusBadge>
        )}
        <span className="inline-flex items-center gap-1.5 text-dense font-medium text-n-600">
          <Globe aria-hidden strokeWidth={1.75} className="size-3.5" />
          {t('source')}
        </span>
      </div>
      <Callout
        tone="warning"
        icon={<Clock aria-hidden />}
        title={closed ? t('answerBy', { at: runsOut }) : t('left', { time: fmt.duration(left) })}
      >
        {closed && state.inDays !== null
          ? t(move ? 'closedRunsOutMove' : 'closedRunsOut', { open: at(addDays(day, state.inDays), state.at), at: runsOut })
          : t(move ? 'runsOutMove' : 'runsOut', { at: runsOut })}
      </Callout>
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <Avatar name={r.client.name} size={40} letters={1} tone="tint" decorative />
          <span className="flex min-w-0 flex-col">
            <span className="text-[16px] leading-[22px] font-semibold text-n-900">{r.client.name}</span>
            {r.client.phone && <span className="text-dense text-n-600 tabular-nums">{fmt.phone(r.client.phone)}</span>}
            <span className="mt-1 flex flex-wrap items-center gap-2">
              {r.client.visits === 0 ? (
                <Pill tone="accent">{t('newClient')}</Pill>
              ) : (
                <span className="text-dense text-n-600">{t('visits', { n: r.client.visits })}</span>
              )}
              {r.client.noShows > 0 && <Pill tone="danger">{t('noShows', { n: r.client.noShows })}</Pill>}
            </span>
          </span>
        </div>
      </div>
      {r.client.alerts.map((alert, i) => (
        <Callout
          key={i}
          tone="warning"
          size="s"
          icon={<TriangleAlert aria-hidden />}
          title={<span className="text-label uppercase">{t('alert')}</span>}
        >
          {alert}
        </Callout>
      ))}
      <KeyValueList
        items={[
          { key: t('service'), value: services },
          ...(staff ? [{ key: t('specialist'), value: staff }] : []),
          // a move: the booking's time now and the one asked for (B5 draws them in their own box)
          ...(move && r.from
            ? [
                { key: t('previousTime'), value: when(r.from.date, r.from.start, r.from.end) },
                { key: t('newTime'), value: when(r.date, r.start, r.end) },
              ]
            : [{ key: t('dateTime'), value: when(r.date, r.start, r.end) }]),
          { key: t('duration'), value: fmt.duration(r.end - r.start) },
          ...(r.price ? [{ key: t('price'), value: fmt.price(r.price) }] : []),
          ...(move ? [{ key: t('booking'), value: t('bookingKeeps') }] : []),
          { key: t('sourceKey'), value: t('online') },
          ...(move ? [] : [{ key: t('sent'), value: sentAt(r.sentAt) }]),
        ]}
      />
      {r.note && <Quote label={t('note')}>{t('noteText', { note: r.note })}</Quote>}
    </DrawerBody>
  )

  function sentAt(at: number) {
    const local = localOf(at)
    return t('when', { date: fmt.relativeShortDate(local.date, day), time: fmt.time(local.min) })
  }
}
