import type { BookingRow as Row } from '@yeral/contract/calendar'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@yeral/ui/menu'
import { useMediaQuery } from '@yeral/ui/media-query'
import { Pill } from '@yeral/ui/pill'
import { StatusBadge } from '@yeral/ui/status-badge'
import { CellNote, Table, TableCell, TableColumnHeader, TableHeader, TableRow } from '@yeral/ui/table'
import { Ellipsis } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { canMoveBooking, useJoin } from '@/entities/booking'

const COLUMNS = 'minmax(180px,1.4fr) minmax(150px,1.2fr) minmax(100px,.8fr) minmax(150px,1fr) 90px minmax(130px,1fr) 44px'
const OWN_COLUMNS = 'minmax(180px,1.4fr) minmax(150px,1.2fr) minmax(150px,1fr) 90px minmax(130px,1fr) 44px'

/** Who cancelled (B-30 step 4): the status alone doesn't say, and the cancelled tab is read for this. */
function useWho() {
  const t = useTranslations('bookings.cancelledBy')
  return (r: Row) => (r.status === 'cancelled' && r.cancelledBy ? t(r.cancelledBy) : null)
}

function useRowWords() {
  const fmt = useFmt()
  const t = useTranslations('bookings')
  const join = useJoin()
  return {
    name: (r: Row) => r.client.name ?? t('unnamed'),
    services: (r: Row) =>
      join(
        r.items.map((i) => i.service),
        'plus',
      ),
    staff: (r: Row) => [...new Set(r.items.flatMap((i) => i.staff ?? []))].join(t('comma')),
    when: (r: Row, now: number) => t('when', { day: fmt.relativeShortDate(r.date, today(now)), time: fmt.timeRange(r.start, r.end) }),
  }
}

/** A row's menu (B-Bookings `menu`): its drawer, then what can be done from here. Moving and booking again go to the calendar. */
function RowMenu({
  row: r,
  now,
  onOpen,
  onMove,
  onBookAgain,
  onOpenClient,
}: {
  row: Row
  now: number
  onOpen: (r: Row) => void
  onMove: (r: Row) => void
  onBookAgain: (r: Row) => void
  onOpenClient: (r: Row) => void
}) {
  const t = useTranslations('bookings.menu')
  const words = useRowWords()
  const request = r.status === 'pending'
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="ghost" size="s" iconOnly aria-label={t('label', { name: words.name(r) })}>
          <Ellipsis aria-hidden />
        </Button>
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem onSelect={() => onOpen(r)}>{t(request ? 'openRequest' : 'openBooking')}</MenuItem>
        {canMoveBooking({ ...r, move: null }, now) && <MenuItem onSelect={() => onMove(r)}>{t('move')}</MenuItem>}
        {(r.status === 'cancelled' || r.status === 'noshow') && r.client.id && (
          <MenuItem onSelect={() => onBookAgain(r)}>{t('bookAgain')}</MenuItem>
        )}
        {r.client.id && <MenuItem onSelect={() => onOpenClient(r)}>{t('openClient')}</MenuItem>}
      </MenuContent>
    </Menu>
  )
}

/**
 * The rows (B-Bookings `.tbl`, book B-30 step 2): the client with «New» on a first visit, the services, the specialist
 * (a specialist reads only their own, so not that column), the time, the source, the status and who cancelled, the
 * menu. Under 768 the rows are a list of the same facts.
 */
export function BookingsTable({
  rows,
  now,
  specialist,
  picked,
  onOpen,
  onMove,
  onBookAgain,
  onOpenClient,
}: {
  rows: readonly Row[]
  now: number
  specialist: boolean
  picked?: string
  onOpen: (r: Row) => void
  onMove: (r: Row) => void
  onBookAgain: (r: Row) => void
  onOpenClient: (r: Row) => void
}) {
  const t = useTranslations('bookings')
  const s = useTranslations('status')
  const who = useWho()
  const words = useRowWords()
  const phone = useMediaQuery('(max-width: 767px)')

  if (phone)
    return (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((r) => (
          <li key={r.code}>
            <button
              type="button"
              onClick={() => onOpen(r)}
              className="flex w-full cursor-pointer flex-col gap-1 rounded-m border border-n-200 bg-n-0 p-3 text-left focus-visible:shadow-focus focus-visible:outline-none"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-small font-semibold text-n-900">{words.name(r)}</span>
                <StatusBadge status={r.status}>{s(r.status)}</StatusBadge>
              </span>
              <span className="text-dense text-n-600 tabular-nums">{words.when(r, now)}</span>
              <span className="truncate text-dense text-n-600">{words.services(r)}</span>
              {who(r) && <span className="text-dense text-n-600">{who(r)}</span>}
            </button>
          </li>
        ))}
      </ul>
    )

  return (
    <Table columns={specialist ? OWN_COLUMNS : COLUMNS} aria-label={t('table')}>
      <TableHeader>
        <TableColumnHeader>{t('columns.client')}</TableColumnHeader>
        <TableColumnHeader>{t('columns.service')}</TableColumnHeader>
        {!specialist && <TableColumnHeader>{t('columns.specialist')}</TableColumnHeader>}
        <TableColumnHeader>{t('columns.time')}</TableColumnHeader>
        <TableColumnHeader>{t('columns.source')}</TableColumnHeader>
        <TableColumnHeader>{t('columns.status')}</TableColumnHeader>
        <TableColumnHeader>
          <span className="sr-only">{t('columns.actions')}</span>
        </TableColumnHeader>
      </TableHeader>
      {rows.map((r) => (
        <TableRow key={r.code} selected={picked === r.code}>
          <TableCell className="flex-col items-start gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpen(r)}
                className="min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left font-semibold text-n-900 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
              >
                {words.name(r)}
              </button>
              {r.client.isNew && (
                <Pill tone="accent" size="s">
                  {t('new')}
                </Pill>
              )}
            </span>
            {r.client.phone && <CellNote className="tabular-nums">{r.client.phone}</CellNote>}
          </TableCell>
          <TableCell>{words.services(r)}</TableCell>
          {!specialist && <TableCell>{words.staff(r)}</TableCell>}
          <TableCell className="tabular-nums">{words.when(r, now)}</TableCell>
          <TableCell>{t(`source.${r.source}`)}</TableCell>
          <TableCell className="flex-col items-start gap-0.5">
            <StatusBadge status={r.status}>{s(r.status)}</StatusBadge>
            {who(r) && <CellNote>{who(r)}</CellNote>}
          </TableCell>
          <TableCell>
            <RowMenu row={r} now={now} onOpen={onOpen} onMove={onMove} onBookAgain={onBookAgain} onOpenClient={onOpenClient} />
          </TableCell>
        </TableRow>
      ))}
    </Table>
  )
}
