import { useMutation, useQuery } from '@tanstack/react-query'
import type { CalendarBooking } from '@yeral/contract/calendar'
import type { InternalStatus } from '@yeral/contract/settings'
import { TEAM_NOTE_MAX } from '@yeral/domain/clients'
import { isOnlineSource } from '@yeral/domain/model'
import type { Level } from '@yeral/domain/permissions'
import { localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@yeral/ui/drawer'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { KeyValueList } from '@yeral/ui/key-value'
import { Quote } from '@yeral/ui/quote'
import { Select } from '@yeral/ui/select'
import { Spinner } from '@yeral/ui/spinner'
import { StatusBadge } from '@yeral/ui/status-badge'
import { toast } from '@yeral/ui/toast'
import { Globe, Phone, User, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BOOKING_STATUS_ICON, useInternalStatusName, useJoin } from '@/entities/booking'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { useNoteAutosave } from '../model/use-note-autosave'
import { AlertNotes, ClientBlock, RecentVisits, RECENT_VISITS } from './client-block'

/**
 * The booking drawer (B-Calendar `panel=booking`, DS-Business BookingDrawer, book F-127, B-16 step 5, B-29): the
 * booking `code` from the address (`?booking=`), read on its own (`sdk.calendar.booking`), so the list and the client
 * card open it too. Its status and where it came from, «Internal status» on a confirmed one (saved at once, Undo in
 * the toast), the client with their facts from the card, the notes the team sees, the details, the client's note,
 * the internal note saved as it's typed, the last visits; the footer holds what its status allows (move, slice 4's
 * B4; report and cancel, B3). A bottom sheet under 768.
 */
export function BookingDrawer({
  slug,
  code,
  now,
  level,
  placeholder,
  onBookAgain,
  onMove,
  onClose,
}: {
  slug: string
  code: string
  now: number
  /** The reader's level: a specialist reads no prices in the visits (B-Calendar `role=specialist`). */
  level: Level
  /** The booking as the page already has it (the day's view): shown at once while it's read on its own. */
  placeholder?: CalendarBooking
  /** «Book again» (B-23): a new booking for this client, with these services and this person. Without it, no button. */
  onBookAgain?: (booking: CalendarBooking) => void
  /** «Move to another time» (B-26, D3's move mode on the grid). Without it, no button. */
  onMove?: (booking: CalendarBooking) => void
  onClose: () => void
}) {
  const t = useTranslations('bookingDrawer.booking')
  const sdk = useSdk()
  const locale = useLocale()
  const errorText = useErrorText()
  const read = useQuery({ ...sdk.calendar.booking(slug, code, locale), placeholderData: placeholder })
  // a booking read once stays through a failed read-back (a note or status saved refreshes it); a failed first read
  // (the page's copy still shown as the placeholder) is the error
  const booking = read.isError && (read.data === undefined || read.isPlaceholderData) ? undefined : read.data
  // the whole team reads the statuses (the field offers the ones switched on, and the booking's own if it was since switched off)
  const statuses = useQuery(sdk.settings.statuses(slug)).data?.items ?? []
  const clientId = booking?.client.id ?? null
  // the client's facts (decision 4): one more than shown, as the booking open may be among the past ones
  const card = useQuery({
    ...sdk.clients.card(slug, clientId ?? '', { lang: locale, history: RECENT_VISITS + 1 }),
    enabled: !!clientId,
  }).data

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()} scrim="auto">
      <DrawerContent>
        <DrawerHeader title={t('title')} closeLabel={t('close')} />
        {booking ? (
          <Body
            key={booking.code}
            slug={slug}
            booking={booking}
            level={level}
            statuses={statuses}
            card={card}
            onBookAgain={onBookAgain && (() => onBookAgain(booking))}
          />
        ) : read.isPending ? (
          <DrawerBody className="items-center justify-center">
            <Spinner label={t('loading')} />
          </DrawerBody>
        ) : (
          <DrawerBody>
            {/* not in the reader's calendar (any more): someone else's column, or gone */}
            <Callout tone="neutral" live>
              {read.error && !isGone(read.error) ? errorText(read.error) : t('gone')}
            </Callout>
          </DrawerBody>
        )}
        {booking && <Footer booking={booking} now={now} onMove={onMove && (() => onMove(booking))} />}
      </DrawerContent>
    </Drawer>
  )
}

/** The api doesn't show the reader this booking: a 404 (someone else's column, a code that isn't one). */
const isGone = (error: unknown) => isApiError(error) && error.status === 404

/** What the drawer shows of one booking. */
function Body({
  slug,
  booking: b,
  level,
  statuses,
  card,
  onBookAgain,
}: {
  slug: string
  booking: CalendarBooking
  level: Level
  statuses: InternalStatus[]
  card: Parameters<typeof ClientBlock>[0]['card']
  onBookAgain?: () => void
}) {
  const t = useTranslations('bookingDrawer.booking')
  const s = useTranslations('status')
  const fmt = useFmt()
  const join = useJoin()
  const errorText = useErrorText()
  const Icon = BOOKING_STATUS_ICON[b.status]
  const staff = join([...new Set(b.items.map((i) => i.staff).filter((n): n is string => !!n))], 'list')
  const note = useNoteAutosave({ slug, code: b.code, saved: b.internalNote })

  return (
    <DrawerBody>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={b.status} icon={<Icon aria-hidden strokeWidth={2} className="size-3.5" />}>
          {s(b.status)}
        </StatusBadge>
        <SourceLine booking={b} />
      </div>
      {b.status === 'confirmed' && <InternalStatusField slug={slug} booking={b} statuses={statuses} />}
      <AlertNotes card={card} />
      <ClientBlock client={b.client} card={card} onBookAgain={onBookAgain} />
      <KeyValueList
        items={[
          {
            key: t('service'),
            value: join(
              b.items.map((i) => i.service),
              'plus',
            ),
          },
          ...(staff ? [{ key: t('specialist'), value: staff }] : []),
          { key: t('dateTime'), value: t('when', { date: fmt.weekdayDate(b.date), time: fmt.timeRange(b.start, b.end) }) },
          { key: t('duration'), value: fmt.duration(b.end - b.start) },
          ...(b.price ? [{ key: t('price'), value: fmt.price(b.price) }] : []),
        ]}
      />
      {/* B3's ReportBox («Report · No-show · … · Remove report») goes here, under the details, when `b.complaint` */}
      {b.clientNote && <Quote label={t('clientNote')}>{t('noteText', { note: b.clientNote })}</Quote>}
      <Field
        label={t('internalNote')}
        // the caption carries the state (B-Calendar `noteCap`): saving, saved, or saved automatically before anything's
        // typed; a failed save has the error alone
        hint={
          note.state === 'failed'
            ? undefined
            : note.state === 'saving'
              ? t('noteSaving')
              : note.typed || b.internalNote
                ? t('noteSaved')
                : t('noteAuto')
        }
        error={note.state === 'failed' && t('noteFailed', { error: errorText(note.error) })}
      >
        <Textarea
          value={note.text}
          maxLength={TEAM_NOTE_MAX}
          placeholder={t('notePlaceholder')}
          onChange={(e) => note.change(e.target.value)}
          onBlur={note.blur}
        />
      </Field>
      <RecentVisits card={card} except={b.code} prices={level !== 'specialist'} />
    </DrawerBody>
  )
}

/** Where the booking came from, or who cancelled it (B-Calendar `.src`). */
function SourceLine({ booking: b }: { booking: CalendarBooking }) {
  const t = useTranslations('bookingDrawer.booking')
  const icon = 'size-3.5'
  const line = (node: ReactNode, words: string) => (
    <span className="inline-flex items-center gap-1.5 text-dense font-medium text-n-600">
      {node}
      {words}
    </span>
  )
  if (b.status === 'cancelled')
    return line(<X aria-hidden strokeWidth={1.75} className={icon} />, t('cancelledBy', { by: b.cancelledBy ?? 'system' }))
  if (b.source === 'phone') return line(<Phone aria-hidden strokeWidth={1.75} className={icon} />, t('byPhone'))
  if (b.source === 'walkin') return line(<User aria-hidden strokeWidth={1.75} className={icon} />, t('walkIn'))
  return isOnlineSource(b.source) ? line(<Globe aria-hidden strokeWidth={1.75} className={icon} />, t('online')) : null
}

/**
 * «Internal status» on a confirmed booking (book B-29, B-Calendar `internal`): None or one switched on (the booking's
 * own stays offered, off, if it was switched off since); nothing when the workspace has none on. A change saves at
 * once, and the toast's Undo puts the one before back.
 */
function InternalStatusField({ slug, booking: b, statuses }: { slug: string; booking: CalendarBooking; statuses: InternalStatus[] }) {
  const t = useTranslations('bookingDrawer.booking')
  const sdk = useSdk()
  const errorText = useErrorText()
  const name = useInternalStatusName()
  const set = useMutation(sdk.calendar.setInternalStatus(slug))
  // what was picked here, over the value it replaced: once the booking reads back changed (with it, or by a colleague),
  // the api's value shows
  const [picked, setPicked] = useState<{ from: string | null; to: string | null } | null>(null)
  const value = picked && picked.from === b.internalStatusId ? picked.to : b.internalStatusId
  const offered = statuses.filter((s) => s.enabled || s.id === b.internalStatusId)
  const change = (statusId: string | null, undo: boolean) => {
    const before = value
    setPicked({ from: b.internalStatusId, to: statusId })
    set.mutate(
      { code: b.code, statusId },
      {
        onSuccess: () => {
          if (undo) return
          const status = statusId ? statuses.find((s) => s.id === statusId) : undefined
          toast(status ? t('internalStatusSet', { name: name(status) }) : t('internalStatusCleared'), {
            // the undo runs later, over the booking as it reads then (not as it was when picked)
            action: { label: t('undo'), onClick: () => latest.current(before, true) },
          })
        },
        onError: (error) => {
          setPicked(null)
          toast(errorText(error))
        },
      },
    )
  }
  const latest = useRef(change)
  useEffect(() => {
    latest.current = change
  })
  if (!offered.length) return null
  return (
    <Field label={t('internalStatus')} hint={t('internalStatusCaption')}>
      <Select size="m" className="max-w-60" value={value ?? ''} onChange={(e) => change(e.target.value || null, false)}>
        <option value="">{t('none')}</option>
        {offered.map((s) => (
          <option key={s.id} value={s.id} disabled={!s.enabled}>
            {name(s)}
          </option>
        ))}
      </Select>
    </Field>
  )
}

/**
 * The footer by status (B-Calendar `.drw-f`): «Move to another time» on a confirmed booking still ahead (B4); B3 adds
 * «Report ▾» on a confirmed or completed one and «Cancel booking» (danger text, its own line on the right) beside
 * the move. A no-show or a cancelled booking has none.
 */
function Footer({ booking: b, now, onMove }: { booking: CalendarBooking; now: number; onMove?: () => void }) {
  const t = useTranslations('bookingDrawer.booking')
  const at = localOf(now)
  const ahead = b.date > at.date || (b.date === at.date && b.start >= at.min)
  const canMove = b.status === 'confirmed' && ahead && !b.move
  if (!(canMove && onMove)) return null
  return (
    <DrawerFooter>
      <Button variant="secondary" onClick={onMove}>
        {t('move')}
      </Button>
    </DrawerFooter>
  )
}
