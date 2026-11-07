import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import {
  CLIENT_AUTO_TAGS,
  CLIENT_SORT_DIR,
  CLIENT_SORTS,
  type ClientAutoTag,
  type ClientRow,
  type ClientSort,
  type SortDir,
} from '@yeral/contract/clients'
import { CLIENT_SEGMENTS, type ClientSegment } from '@yeral/domain/clients'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { EmptyState } from '@yeral/ui/empty-state'
import { FilterBar, type FilterBarLabels, type FilterDef } from '@yeral/ui/filter-bar'
import { useMediaQuery } from '@yeral/ui/media-query'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { Spinner } from '@yeral/ui/spinner'
import {
  CellNote,
  Table,
  TableCell,
  TableColumnHeader,
  TableFrame,
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
import { clientsSearch, type ClientsSearch } from '../model/search'
import { AddClientModal } from './add-client-modal'

// DS-Lists A6 `.tr`: Name · Phone · Tags · Visits · Last visit · Total · Next booking · one icon (cells pad 8 each side)
const COLUMNS = 'minmax(160px,1.3fr) 184px minmax(184px,1.5fr) 72px 112px 112px 160px 48px'
const NO_TOTAL = 'minmax(160px,1.3fr) 184px minmax(184px,1.5fr) 72px 112px 160px 48px'
/** An automatic tag's value in the Tag menu, apart from the team's tags (a team tag can't start so: it has no colon). */
const AUTO = 'auto:'
/** The Sort menu's words for a sort the other way round from its own direction. */
const REVERSED = {
  recent: 'recentAsc',
  name: 'nameDesc',
  visits: 'visitsAsc',
  lastVisit: 'lastVisitAsc',
  total: 'totalAsc',
  nextBooking: 'nextBookingDesc',
} as const satisfies Record<ClientSort, string>

/**
 * The clients list (B7-Clients B5, DS-Lists A6): the segments with their counts, the FilterBar (search, Tag with
 * counts, Upcoming booking, Sort; the active chips, Clear all, «24 of 100 clients»; the Filters sheet under 768), one
 * line per client —
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
  // read through the route's own rules again: the stories' router passes the address as it stands
  const search = clientsSearch(useSearch({ strict: false }))
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
    ...sdk.clients.list(slug, {
      q: search.q,
      segment: search.segment,
      tag: search.tag,
      auto: search.auto,
      upcoming: search.upcoming,
      sort: search.sort,
      dir: search.dir,
    }),
    placeholderData: keepPreviousData,
  })
  const rows = list.data?.pages.flatMap((p) => p.items) ?? []
  const first = list.data?.pages[0]
  const counts = first?.counts
  const filtered = !!(search.q || search.segment || search.tag || search.auto || search.upcoming)
  // the api sends no Total to those who don't see revenue
  const seesTotal = rows.some((r) => r.total !== null)
  const book = (id: string) => void navigate({ to: '/w/$slug/calendar', params: { slug }, search: { panel: 'new', client: id } })
  const copy = (number: string) => void navigator.clipboard.writeText(fmt.phone(number)).then(() => toast(t('copied')))
  const clear = () => {
    setTyped('')
    go({ q: undefined, segment: undefined, tag: undefined, auto: undefined, upcoming: undefined })
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

  // the bar (DS-Lists A5, B7-Clients B5): every menu counts under the other filters, a choice applies at once
  const f = useTranslations('clients.filters')
  const labels: FilterBarLabels = {
    filters: f('filters'),
    clearAll: f('clearAll'),
    clear: f('clear'),
    close: f('close'),
    back: f('back'),
    showResults: f('showResults', { n: first?.total ?? 0 }),
    searchIn: f('searchIn'),
    remove: (chip) => f('remove', { chip }),
    nothingMatches: (q) => f('nothingMatches', { q }),
  }
  // a chosen tag keeps its spelling from the address, and stays in the menu (0) when no client holds it now
  const chosenTags = search.tag ?? []
  const spelled = (name: string) => chosenTags.find((tag) => tag.toLowerCase() === name.toLowerCase()) ?? name
  const tagCounts = first?.tags ?? []
  const tagOptions = [
    ...tagCounts.map((x) => ({ value: spelled(x.name), label: spelled(x.name), meta: fmt.number(x.count) })),
    ...chosenTags
      .filter((tag) => !tagCounts.some((x) => x.name.toLowerCase() === tag.toLowerCase()))
      .map((tag) => ({ value: tag, label: tag, meta: fmt.number(0) })),
  ]
  // the one Tag menu (v0.7 · D): Ýeral's automatic tags first (Trusted with its count), then the team's own; the
  // automatic one travels in the address as `auto`, apart from the team's `tag`
  const autoValue = (auto: ClientAutoTag) => `${AUTO}${auto}`
  const tagValues = [...(search.auto ? [autoValue(search.auto)] : []), ...chosenTags]
  const filters: FilterDef[] = [
    {
      id: 'tag',
      label: f('tag'),
      multiple: true,
      options: [
        {
          label: f('automatic'),
          options: CLIENT_AUTO_TAGS.map((auto) => ({ value: autoValue(auto), label: t(auto), meta: fmt.number(first?.auto[auto] ?? 0) })),
        },
        ...(tagOptions.length ? [{ label: f('yourTags'), options: tagOptions }] : []),
      ],
      value: tagValues,
      onValueChange: (values) => {
        const auto = CLIENT_AUTO_TAGS.find((a) => values.includes(autoValue(a)))
        const tag = values.filter((v) => !v.startsWith(AUTO))
        go({ tag: tag.length ? tag : undefined, auto })
      },
    },
    {
      id: 'upcoming',
      label: f('upcoming'),
      anyLabel: f('any'),
      options: (['yes', 'no'] as const).map((value) => ({
        value,
        label: f(value === 'yes' ? 'upcomingYes' : 'upcomingNo'),
        meta: first ? fmt.number(first.upcoming[value]) : undefined,
      })),
      value: search.upcoming ?? null,
      onValueChange: (value) => go({ upcoming: value === 'yes' || value === 'no' ? value : undefined }),
      chip: (option) => option.label,
      short: (option) => f(option.value === 'yes' ? 'yes' : 'no'),
    },
  ]
  // the Sort menu: each sort in its own direction (Total only for those who see revenue), and the current one if reversed
  const shownSort = sortBy === 'total' && !seesTotal ? 'recent' : sortBy
  const shownDir = shownSort === sortBy ? dir : CLIENT_SORT_DIR[shownSort]
  const sortLabel = (col: ClientSort, d: SortDir) => f(`sorts.${d === CLIENT_SORT_DIR[col] ? col : REVERSED[col]}`)
  const sortOptions = CLIENT_SORTS.filter((col) => col !== 'total' || seesTotal).map((col) => ({
    value: `${col}:${CLIENT_SORT_DIR[col]}`,
    label: sortLabel(col, CLIENT_SORT_DIR[col]),
  }))
  if (shownDir !== CLIENT_SORT_DIR[shownSort])
    sortOptions.push({ value: `${shownSort}:${shownDir}`, label: sortLabel(shownSort, shownDir) })
  const pickSort = (value: string) => {
    const [col, d] = value.split(':') as [ClientSort, SortDir]
    go({ sort: col === 'recent' ? undefined : col, dir: d === CLIENT_SORT_DIR[col] ? undefined : d })
  }
  const countText = first && (filtered ? f('of', { n: first.total ?? rows.length, m: first.everyone }) : f('count', { n: first.everyone }))

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
        <div className="max-w-full overflow-x-auto">
          <Segmented
            aria-label={t('segmentsLabel')}
            value={search.segment ?? 'all'}
            onValueChange={(value) => go({ segment: value === 'all' ? undefined : (value as ClientSegment) })}
          >
            {(['all', ...CLIENT_SEGMENTS] as const).map((value) => (
              <SegmentedItem key={value} value={value}>
                {value === 'all' ? t('all') : t(`segments.${value}`)}
                {counts && <span className="font-normal text-n-500 tabular-nums">{fmt.number(counts[value])}</span>}
              </SegmentedItem>
            ))}
          </Segmented>
        </div>
        <FilterBar
          labels={labels}
          search={{ value: typed, onChange: setTyped, placeholder: t('search') }}
          filters={filters}
          sort={{ label: f('sort'), value: `${shownSort}:${shownDir}`, options: sortOptions, onValueChange: pickSort }}
          count={countText}
          onClearAll={() => {
            setTyped('')
            go({ q: undefined, tag: undefined, auto: undefined, upcoming: undefined })
          }}
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
          <TableFrame className="rounded-m">
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
                      {tagChips({ trusted: r.trusted, phoneOnly: r.phoneOnly, segments: r.segments, tags: r.tags })}
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
          </TableFrame>
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
