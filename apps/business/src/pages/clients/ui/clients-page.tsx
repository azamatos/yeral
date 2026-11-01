import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import type { ClientRow } from '@yeral/contract/clients'
import { CLIENT_SEGMENTS, type ClientSegment } from '@yeral/domain/clients'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { useClock } from '@yeral/ui/clock'
import { cn } from '@yeral/ui/cn'
import { EmptyState } from '@yeral/ui/empty-state'
import { Input } from '@yeral/ui/input'
import { useMediaQuery } from '@yeral/ui/media-query'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@yeral/ui/menu'
import { Spinner } from '@yeral/ui/spinner'
import { CellNote, Table, TableCell, TableColumnHeader, TableHeader, TableRow } from '@yeral/ui/table'
import { toast } from '@yeral/ui/toast'
import { Ellipsis, Plus, SearchX, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from 'use-intl'
import { ClientTags } from '@/entities/client'
import { useSdk } from '@/shared/api'
import { useWorkspace, WorkspacePage } from '@/widgets/workspace-shell'
import type { ClientsSearch } from '../model/search'
import { AddClientModal } from './add-client-modal'

const COLUMNS = 'minmax(200px,1.5fr) minmax(130px,1fr) 80px minmax(110px,.8fr) minmax(90px,.7fr) minmax(150px,1fr) 44px'
const NO_TOTAL = 'minmax(200px,1.5fr) minmax(130px,1fr) 80px minmax(110px,.8fr) minmax(150px,1fr) 44px'

/**
 * The clients list (B-Clients, book B-32, B-33): the search, the segment chips, the rows with their tags (Phone only and
 * Reported first), visits, last visit, Total for those who see revenue, the next booking; add a client. A specialist
 * reads the clients who've booked with them.
 */
export function ClientsPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return <Clients key={workspace.slug} slug={workspace.slug} manage={workspace.level !== 'specialist'} />
}

function Clients({ slug, manage }: { slug: string; manage: boolean }) {
  const t = useTranslations('clients')
  const sections = useTranslations('shell.sections')
  const fmt = useFmt()
  const sdk = useSdk()
  const now = useClock()
  const navigate = useNavigate()
  const search: ClientsSearch = useSearch({ strict: false })
  const phone = useMediaQuery('(max-width: 767px)')
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
    ...sdk.clients.list(slug, { q: search.q, segment: search.segment }),
    placeholderData: keepPreviousData,
  })
  const rows = list.data?.pages.flatMap((p) => p.items) ?? []
  const filtered = !!(search.q || search.segment)
  // the api sends no Total to those who don't see revenue
  const seesTotal = rows.some((r) => r.total !== null)
  const book = (id: string) => void navigate({ to: '/w/$slug/calendar', params: { slug }, search: { panel: 'new', client: id } })
  const copy = (r: ClientRow) => {
    if (!r.phone) return
    void navigator.clipboard.writeText(r.phone).then(() => toast(t('copied')))
  }
  const clear = () => {
    setTyped('')
    go({ q: undefined, segment: undefined })
  }

  if (list.isError && !list.data) throw list.error

  const tags = (r: ClientRow) => (
    <span className="flex flex-wrap gap-1">
      <ClientTags phoneOnly={r.phoneOnly} segments={r.segments} tags={r.tags} />
    </span>
  )
  const name = (r: ClientRow) => r.name ?? t('unnamed')
  const open = (r: ClientRow, search: { remove?: true } = {}) =>
    void navigate({ to: '/w/$slug/clients/$id', params: { slug, id: r.id }, search })
  const nameLink = (r: ClientRow, className: string) => (
    <Link
      to="/w/$slug/clients/$id"
      params={{ slug, id: r.id }}
      className={cn('text-n-900 no-underline hover:underline focus-visible:shadow-focus focus-visible:outline-none', className)}
    >
      {name(r)}
    </Link>
  )
  const next = (r: ClientRow) =>
    r.next ? t('next', { day: fmt.relativeShortDate(r.next.date, todayDate), time: fmt.time(r.next.start) }) : ''
  const menu = (r: ClientRow) => (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="ghost" size="s" iconOnly aria-label={t('actions', { name: name(r) })}>
          <Ellipsis aria-hidden />
        </Button>
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem onSelect={() => open(r)}>{t('openCard')}</MenuItem>
        <MenuItem onSelect={() => book(r.id)}>{t('book')}</MenuItem>
        {r.phone && <MenuItem onSelect={() => copy(r)}>{t('copy')}</MenuItem>}
        {manage && (
          <MenuItem className="text-danger-ink" onSelect={() => open(r, { remove: true })}>
            {t('delete')}
          </MenuItem>
        )}
      </MenuContent>
    </Menu>
  )

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
          options={[{ value: 'all', label: t('all') }, ...CLIENT_SEGMENTS.map((value) => ({ value, label: t(`segments.${value}`) }))]}
        />
        {list.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner label={t('loading')} />
          </div>
        ) : rows.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<SearchX aria-hidden />}
              title={t('nothing')}
              description={t('nothingHint')}
              action={
                <Button variant="secondary" size="s" onClick={clear}>
                  {t('clearFilters')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Users aria-hidden />}
              title={t('empty')}
              action={
                <Button size="s" onClick={() => go({ modal: 'add' })}>
                  {t('add.title')}
                </Button>
              }
            />
          )
        ) : phone ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-m border border-n-200 bg-n-0 p-3">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  {nameLink(r, 'truncate text-small font-semibold')}
                  {r.phone && <span className="text-dense text-n-600 tabular-nums">{r.phone}</span>}
                  {tags(r)}
                </span>
                {menu(r)}
              </li>
            ))}
          </ul>
        ) : (
          <Table columns={seesTotal ? COLUMNS : NO_TOTAL} aria-label={t('table')}>
            <TableHeader>
              <TableColumnHeader>{t('columns.client')}</TableColumnHeader>
              <TableColumnHeader>{t('columns.phone')}</TableColumnHeader>
              <TableColumnHeader>{t('columns.visits')}</TableColumnHeader>
              <TableColumnHeader>{t('columns.last')}</TableColumnHeader>
              {seesTotal && <TableColumnHeader>{t('columns.total')}</TableColumnHeader>}
              <TableColumnHeader>{t('columns.next')}</TableColumnHeader>
              <TableColumnHeader>
                <span className="sr-only">{t('columns.actions')}</span>
              </TableColumnHeader>
            </TableHeader>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="flex-col items-start gap-1">
                  {nameLink(r, 'font-semibold')}
                  {tags(r)}
                </TableCell>
                <TableCell className="tabular-nums">{r.phone ?? <CellNote>{t('noNumber')}</CellNote>}</TableCell>
                <TableCell className="tabular-nums">{r.visits}</TableCell>
                <TableCell className="tabular-nums">{r.lastVisit ? fmt.relativeShortDate(r.lastVisit, todayDate) : ''}</TableCell>
                {seesTotal && <TableCell className="tabular-nums">{r.total !== null ? fmt.money(r.total) : ''}</TableCell>}
                <TableCell className="tabular-nums">{next(r)}</TableCell>
                <TableCell>{menu(r)}</TableCell>
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
