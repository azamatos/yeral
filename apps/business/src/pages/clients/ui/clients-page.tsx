import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { CLIENT_SORT_DIR, type ClientRow, type ClientSort } from '@yeral/contract/clients'
import { CLIENT_SEGMENTS, type ClientSegment } from '@yeral/domain/clients'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { useClock } from '@yeral/ui/clock'
import { EmptyState } from '@yeral/ui/empty-state'
import { Input } from '@yeral/ui/input'
import { useMediaQuery } from '@yeral/ui/media-query'
import { Spinner } from '@yeral/ui/spinner'
import {
  CellNote,
  Table,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableIconAction,
  TableRow,
  TableRowLink,
  TableSortHeader,
  TableTags,
  TruncatedText,
  type SortState,
} from '@yeral/ui/table'
import { toast } from '@yeral/ui/toast'
import { CalendarPlus, Copy, Plus, SearchX, Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useClientTagChips } from '@/entities/client'
import { useSdk } from '@/shared/api'
import { useWorkspace, WorkspacePage } from '@/widgets/workspace-shell'
import type { ClientsSearch } from '../model/search'
import { AddClientModal } from './add-client-modal'

// DS-Lists A6 `.tr`: Name · Phone · Tags · Visits · Last visit · Total · Next booking · one icon (cells pad 8 each side)
const COLUMNS = 'minmax(180px,1.6fr) 192px minmax(120px,1.4fr) 80px 112px 128px 168px 48px'
const NO_TOTAL = 'minmax(180px,1.6fr) 192px minmax(120px,1.4fr) 80px 112px 168px 48px'

/**
 * The clients list (B7-Clients B5, DS-Lists A6): the search, the segment chips with their counts, one line per client —
 * the name is the row's link to the card, the number with its copy icon, the tags with «+N», visits, last visit, Total
 * for those who see revenue, the next booking — and one «New booking» icon; delete lives in the card. The headers sort
 * through the address (`?sort&dir`). On a phone the rows are 68-high list items. A specialist reads the clients who've
 * booked with them.
 */
export function ClientsPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return <Clients key={workspace.slug} slug={workspace.slug} />
}

function Clients({ slug }: { slug: string }) {
  const t = useTranslations('clients')
  const sections = useTranslations('shell.sections')
  const fmt = useFmt()
  const sdk = useSdk()
  const now = useClock()
  const navigate = useNavigate()
  const search: ClientsSearch = useSearch({ strict: false })
  const phone = useMediaQuery('(max-width: 767px)')
  const tagChips = useClientTagChips()
  const todayDate = today(now)
  const go = (patch: Partial<ClientsSearch>) =>
    void navigate({ to: '.', search: (prev: ClientsSearch) => ({ ...prev, ...patch }), replace: true })

  // the search box writes to the address after a pause in the typing
  const [typed, setTyped] = useState(search.q ?? '')
  useEffect(() => {
    const q = typed.trim() || undefined
    if (q === search.q) return
    const timer = setTimeout(() => go({ q }), 250)
    return () => clearTimeout(timer)
  })

  const list = useInfiniteQuery({
    ...sdk.clients.list(slug, { q: search.q, segment: search.segment, sort: search.sort, dir: search.dir }),
    placeholderData: keepPreviousData,
  })
  const rows = list.data?.pages.flatMap((p) => p.items) ?? []
  const counts = list.data?.pages[0]?.counts
  const filtered = !!(search.q || search.segment)
  // the api sends no Total to those who don't see revenue
  const seesTotal = rows.some((r) => r.total !== null)
  const book = (id: string) => void navigate({ to: '/w/$slug/calendar', params: { slug }, search: { panel: 'new', client: id } })
  const copy = (number: string) => void navigator.clipboard.writeText(fmt.phone(number)).then(() => toast(t('copied')))
  const clear = () => {
    setTyped('')
    go({ q: undefined, segment: undefined })
  }

  // the first click gives the column's natural order (A → Z, the most and the newest first), the second reverses it
  const sortBy = search.sort ?? 'recent'
  const dir = search.dir ?? CLIENT_SORT_DIR[sortBy]
  const sortOf = (col: ClientSort): SortState => (sortBy !== col ? 'none' : dir === 'asc' ? 'ascending' : 'descending')
  const sort = (col: ClientSort) => {
    if (sortBy !== col) return go({ sort: col, dir: undefined })
    const flipped = dir === 'asc' ? 'desc' : 'asc'
    go({ dir: flipped === CLIENT_SORT_DIR[col] ? undefined : flipped })
  }

  if (list.isError && !list.data) throw list.error

  const name = (r: ClientRow) => r.name ?? t('unnamed')
  const next = (r: ClientRow) =>
    r.next ? t('next', { day: fmt.relativeShortDate(r.next.date, todayDate), time: fmt.time(r.next.start) }) : '—'
  const last = (r: ClientRow) => (r.lastVisit ? fmt.relativeShortDate(r.lastVisit, todayDate) : '—')
  const sortHeader = (col: ClientSort, label: ReactNode, numeric = false) => (
    <TableSortHeader sort={sortOf(col)} onSort={() => sort(col)} numeric={numeric}>
      {label}
    </TableSortHeader>
  )
  // the phone's list item shows the sorted column's value on the right (Last visit when it's the usual order)
  const fact = (r: ClientRow) =>
    sortBy === 'visits'
      ? t('visitsCount', { count: r.visits })
      : sortBy === 'total' && r.total !== null
        ? fmt.money(r.total)
        : sortBy === 'nextBooking'
          ? next(r)
          : last(r)

  return (
    <WorkspacePage
      title={sections('clients')}
      actions={
        <Button size="s" onClick={() => go({ modal: 'add' })}>
          <Plus aria-hidden />
          {t('add.title')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          aria-label={t('search')}
          placeholder={t('search')}
          className="w-full sm:w-80"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <ChipRadioGroup
          aria-label={t('segmentsLabel')}
          value={search.segment ?? 'all'}
          onValueChange={(value) => go({ segment: value === 'all' ? undefined : (value as ClientSegment) })}
          options={(['all', ...CLIENT_SEGMENTS] as const).map((value) => ({
            value,
            label: (
              <>
                {value === 'all' ? t('all') : t(`segments.${value}`)}
                {counts && <span className="text-n-500 tabular-nums">{fmt.number(counts[value])}</span>}
              </>
            ),
          }))}
        />
        {list.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner label={t('loading')} />
          </div>
        ) : rows.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<SearchX aria-hidden />}
              title={search.q ? t('nothingQuery', { q: search.q }) : t('nothing')}
              description={t('nothingHint')}
              action={
                <Button variant="tertiary" size="s" onClick={clear}>
                  {t('clearFilters')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Users aria-hidden />}
              title={t('empty')}
              description={t('emptyHint')}
              action={
                <Button onClick={() => go({ modal: 'add' })}>
                  <Plus aria-hidden />
                  {t('addClient')}
                </Button>
              }
            />
          )
        ) : phone ? (
          <ul aria-label={t('table')} className="m-0 flex list-none flex-col p-0">
            {rows.map((r) => (
              <li key={r.id} className="border-b border-n-200 last:border-b-0">
                <Link
                  to="/w/$slug/clients/$id"
                  params={{ slug, id: r.id }}
                  className="flex h-17 flex-col justify-center gap-1 px-1 text-n-900 no-underline focus-visible:shadow-focus-inset focus-visible:outline-none active:bg-n-50"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="min-w-0 flex-1 truncate text-body font-medium">{name(r)}</span>
                    <span className="shrink-0 text-dense text-n-500">{fact(r)}</span>
                  </span>
                  <span className="truncate text-dense text-n-500">
                    {[r.phone ? fmt.phone(r.phone) : t('noNumber'), t('visitsCount', { count: r.visits })].join(' · ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Table columns={seesTotal ? COLUMNS : NO_TOTAL} aria-label={t('table')}>
            <TableHeader>
              {sortHeader('name', t('columns.name'))}
              <TableColumnHeader>{t('columns.phone')}</TableColumnHeader>
              <TableColumnHeader>{t('columns.tags')}</TableColumnHeader>
              {sortHeader('visits', t('columns.visits'), true)}
              {sortHeader('lastVisit', t('columns.last'))}
              {seesTotal && sortHeader('total', t('columns.total'), true)}
              {sortHeader('nextBooking', t('columns.next'))}
              <TableColumnHeader>
                <span className="sr-only">{t('columns.actions')}</span>
              </TableColumnHeader>
            </TableHeader>
            {rows.map((r) => (
              <TableRow key={r.id} className="h-14 min-h-0">
                <TableCell className="py-0">
                  <TableRowLink asChild>
                    <Link to="/w/$slug/clients/$id" params={{ slug, id: r.id }}>
                      <TruncatedText>{name(r)}</TruncatedText>
                    </Link>
                  </TableRowLink>
                </TableCell>
                <TableCell className="flex-row items-center gap-1 py-0">
                  {r.phone ? (
                    <>
                      <span className="whitespace-nowrap">{fmt.phone(r.phone)}</span>
                      <TableIconAction label={t('copy')} onClick={() => copy(r.phone!)}>
                        <Copy aria-hidden />
                      </TableIconAction>
                    </>
                  ) : (
                    <CellNote>{t('noNumber')}</CellNote>
                  )}
                </TableCell>
                <TableCell className="py-0">
                  <TableTags moreLabel={(count) => t('moreTags', { count })}>
                    {tagChips({ phoneOnly: r.phoneOnly, segments: r.segments, tags: r.tags })}
                  </TableTags>
                </TableCell>
                <TableCell numeric className="py-0">
                  {fmt.number(r.visits)}
                </TableCell>
                <TableCell className="py-0">{last(r)}</TableCell>
                {seesTotal && (
                  <TableCell numeric className="py-0">
                    {r.total !== null ? fmt.money(r.total) : ''}
                  </TableCell>
                )}
                <TableCell className="py-0">
                  <TruncatedText>{next(r)}</TruncatedText>
                </TableCell>
                <TableCell className="py-0">
                  <TableIconAction label={t('bookFor', { name: name(r) })} onClick={() => book(r.id)}>
                    <CalendarPlus aria-hidden />
                  </TableIconAction>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
        {list.hasNextPage && (
          <Button variant="secondary" className="self-center" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
            {t('showMore')}
          </Button>
        )}
      </div>
      {search.modal === 'add' && (
        <AddClientModal
          slug={slug}
          today={todayDate}
          onSaved={(id, andBook) => (andBook ? book(id) : go({ modal: undefined }))}
          onClose={() => go({ modal: undefined })}
        />
      )}
    </WorkspacePage>
  )
}
