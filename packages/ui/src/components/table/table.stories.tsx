/**
 * Data table — DS-Components → «Table with sort, filter and bulk actions» (business bookings), and DS-Lists A6 (v0.7):
 * sortable headers, the whole row as the link, one icon action, a tags column with «+N», one line per row with the
 * full text in a tooltip, right-aligned tabular numbers.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowDown, ChevronDown, Download, MoreHorizontal, Phone, Search } from 'lucide-react'
import { useState } from 'react'
import { CalendarPlus, Copy, Repeat } from 'lucide-react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Chip, TagChip } from '../chip'
import { StatusBadge, type BookingStatus } from '../status-badge'
import { BulkBar } from '../bulk-bar'
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
  TableToolbar,
  type SortState,
} from './table'

const rows: {
  id: string
  name: string
  phone: string
  service: string
  note: string
  staff: string
  time: string
  status: BookingStatus
  label: string
  byPhone?: boolean
}[] = [
  {
    id: '1',
    name: 'Aýjemal G.',
    phone: '+993 65 90 11 22',
    service: 'Saç reňklemek',
    note: '120 min · 150 TMT',
    staff: 'Aýna',
    time: '14:30–16:30',
    status: 'pending',
    label: 'Garaşylýar',
  },
  {
    id: '2',
    name: 'Tymur A.',
    phone: '+993 65 12 34 56 · 3-nji gelşi',
    service: 'Erkek saç kesimi',
    note: '60 min · 40 TMT',
    staff: 'Myrat',
    time: '15:00–16:00',
    status: 'pending',
    label: 'Garaşylýar',
  },
  {
    id: '3',
    name: 'Merdan K.',
    phone: '+993 62 21 08 40',
    service: 'Sakgal düzediş',
    note: '30 min · 25 TMT',
    staff: 'Begenç',
    time: '16:00–16:30',
    status: 'confirmed',
    label: 'Tassyklandy',
    byPhone: true,
  },
  {
    id: '4',
    name: 'Aýdym Ş.',
    phone: '+993 65 44 70 19',
    service: 'Erkek saç kesimi',
    note: '60 min · 40 TMT',
    staff: 'Serdar',
    time: '12:00–13:00',
    status: 'completed',
    label: 'Tamamlandy',
  },
  {
    id: '5',
    name: 'Gülälek N.',
    phone: '+993 61 03 52 88',
    service: 'Çaga saç kesimi',
    note: '45 min · 30 TMT',
    staff: 'Myrat',
    time: '11:00–11:45',
    status: 'noshow',
    label: 'Gelmedi',
  },
]

function Bookings() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['1', '2']))
  const toggle = (id: string) => setSelected((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])))
  return (
    <TableFrame>
      <TableToolbar>
        <span className="text-[19px] font-bold tracking-[-0.02em]">Ýazylyşlar</span>
        <span className="text-dense text-n-600">Çarşenbe, 14 oktýabr</span>
        <div className="flex-1" />
        <label className="flex h-9 w-60 items-center gap-2 rounded-ctl-m border border-n-300 px-3 text-small text-n-500">
          <Search className="size-4" />
          <input
            aria-label="Müşderi ýa-da telefon"
            placeholder="Müşderi ýa-da telefon"
            className="w-full border-0 bg-transparent text-n-900 outline-none placeholder:text-n-500"
          />
        </label>
        <Chip selected>Garaşylýar · 2</Chip>
        <Chip>
          Hünärmen
          <ChevronDown />
        </Chip>
        <Button size="s">
          <Download />
          Eksport
        </Button>
      </TableToolbar>
      <Table columns="48px 1.5fr 1.5fr 1fr 1fr 150px 48px" aria-label="Ýazylyşlar">
        <TableHeader>
          <TableColumnHeader className="justify-center">
            <Checkbox
              aria-label="Ählisini saýla"
              checked={selected.size === rows.length}
              onChange={() => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)))}
            />
          </TableColumnHeader>
          <TableColumnHeader>Müşderi</TableColumnHeader>
          <TableColumnHeader>Hyzmat</TableColumnHeader>
          <TableColumnHeader>Hünärmen</TableColumnHeader>
          <TableColumnHeader aria-sort="ascending" className="text-n-900">
            Wagt
            <ArrowDown className="size-3.5" />
          </TableColumnHeader>
          <TableColumnHeader>Ýagdaý</TableColumnHeader>
          <TableColumnHeader>
            <span className="sr-only">Hereketler</span>
          </TableColumnHeader>
        </TableHeader>
        {rows.map((r) => (
          <TableRow key={r.id} selected={selected.has(r.id)}>
            <TableCell className="items-center">
              <Checkbox aria-label={`Saýla: ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1.5 font-semibold">
                {r.name}
                {r.byPhone && <Phone aria-label="Telefon arkaly" className="size-3.5" />}
              </span>
              <CellNote>{r.phone}</CellNote>
            </TableCell>
            <TableCell>
              <span>{r.service}</span>
              <CellNote>{r.note}</CellNote>
            </TableCell>
            <TableCell>{r.staff}</TableCell>
            <TableCell>{r.time}</TableCell>
            <TableCell>
              <StatusBadge status={r.status}>{r.label}</StatusBadge>
            </TableCell>
            <TableCell>
              <Button variant="plain" iconOnly size="s" aria-label={`Hereketler: ${r.name}`}>
                <MoreHorizontal />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </Table>
      {selected.size > 0 && (
        <BulkBar
          count={`${selected.size} saýlandy`}
          aria-label="Saýlanan ýazylyşlar"
          clearLabel="Saýlawy aýyr"
          onClear={() => setSelected(new Set())}
        >
          <Button variant="inverse-solid" size="s">
            Tassykla
          </Button>
          <Button variant="inverse-outline" size="s">
            Ret et
          </Button>
          <Button variant="inverse-outline" size="s">
            <Download />
            CSV
          </Button>
        </BulkBar>
      )}
    </TableFrame>
  )
}

const meta = { title: 'Data/Table', component: Bookings, parameters: { layout: 'padded' } } satisfies Meta<typeof Bookings>
export default meta
type Story = StoryObj<typeof meta>

export const BusinessBookings: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('2 saýlandy')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Saýlawy aýyr' }))
    await expect(canvas.queryByText('2 saýlandy')).not.toBeInTheDocument()
  },
}

// ── A6 · the Clients table (DS-Lists 02) ──

const clients = [
  {
    name: 'Mähribangül Nurmuhammedowa-Allaberdiýewa',
    phone: '+993 61 30 44 92',
    tags: ['Bride'],
    auto: true,
    visits: 11,
    last: '12 Oct',
    total: '1,320 TMT',
    next: 'Fri, 16 Oct · 11:00',
  },
  {
    name: 'Jahan Muradowa',
    phone: '+993 65 12 34 56',
    tags: ['VIP'],
    auto: true,
    visits: 14,
    last: '2 Oct',
    total: '1,680 TMT',
    next: 'Thu, 15 Oct · 10:00',
  },
  {
    name: 'Gülälek Nurmuhammedowa',
    phone: '+993 65 44 70 19',
    tags: ['VIP', 'Allergy: ammonia', 'Mornings only', 'Colour client'],
    auto: true,
    visits: 12,
    last: '28 Sep',
    total: '1,740 TMT',
    next: 'Today · 15:00',
  },
  {
    name: 'Jahan Orazowa',
    phone: '+993 64 77 02 13',
    tags: ['Student'],
    auto: false,
    visits: 6,
    last: '30 Sep',
    total: '690 TMT',
    next: '—',
  },
]
const A6_COLUMNS = 'minmax(160px,1.6fr) 192px minmax(120px,1.4fr) 80px 112px 128px 168px 48px'

function ClientsTable({
  onOpen,
  onBook,
  onCopy,
}: {
  onOpen: (name: string) => void
  onBook: (name: string) => void
  onCopy: (phone: string) => void
}) {
  const [sort, setSort] = useState<{ by: 'name' | 'visits'; dir: SortState }>({ by: 'visits', dir: 'descending' })
  const by = (col: 'name' | 'visits', natural: SortState) => () =>
    setSort((s) => ({ by: col, dir: s.by !== col ? natural : s.dir === 'ascending' ? 'descending' : 'ascending' }))
  const rows = [...clients].sort((a, b) => {
    const d = sort.by === 'name' ? a.name.localeCompare(b.name) : a.visits - b.visits
    return sort.dir === 'ascending' ? d : -d
  })
  return (
    <TableFrame className="max-w-300">
      <Table columns={A6_COLUMNS} aria-label="Clients">
        <TableHeader>
          <TableSortHeader sort={sort.by === 'name' ? sort.dir : 'none'} onSort={by('name', 'ascending')}>
            Name
          </TableSortHeader>
          <TableColumnHeader>Phone</TableColumnHeader>
          <TableColumnHeader>Tags</TableColumnHeader>
          <TableSortHeader numeric sort={sort.by === 'visits' ? sort.dir : 'none'} onSort={by('visits', 'descending')}>
            Visits
          </TableSortHeader>
          <TableColumnHeader>Last visit</TableColumnHeader>
          <TableColumnHeader numeric>Total</TableColumnHeader>
          <TableColumnHeader>Next booking</TableColumnHeader>
          <TableColumnHeader>
            <span className="sr-only">Actions</span>
          </TableColumnHeader>
        </TableHeader>
        {rows.map((c) => (
          <TableRow key={c.name} className="h-14">
            <TableCell>
              <TableRowLink
                href="#client"
                onClick={(e) => {
                  e.preventDefault()
                  onOpen(c.name)
                }}
              >
                {c.name}
              </TableRowLink>
            </TableCell>
            <TableCell className="flex-row items-center gap-1">
              <span className="whitespace-nowrap">{c.phone}</span>
              <TableIconAction label="Copy number" onClick={() => onCopy(c.phone)}>
                <Copy aria-hidden />
              </TableIconAction>
            </TableCell>
            <TableCell>
              <TableTags moreLabel={(n) => `${n} more tags`}>
                {c.auto && (
                  <TagChip size="s" kind="automatic" icon={<Repeat aria-hidden />}>
                    Regular
                  </TagChip>
                )}
                {c.tags.map((t) => (
                  <TagChip key={t} size="s">
                    {t}
                  </TagChip>
                ))}
              </TableTags>
            </TableCell>
            <TableCell numeric>{c.visits}</TableCell>
            <TableCell>{c.last}</TableCell>
            <TableCell numeric>{c.total}</TableCell>
            <TableCell className="truncate">{c.next}</TableCell>
            <TableCell>
              <TableIconAction label={`New booking for ${c.name}`} onClick={() => onBook(c.name)}>
                <CalendarPlus aria-hidden />
              </TableIconAction>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </TableFrame>
  )
}

/** A6: sort by Visits (natural: most first), then by Name (A → Z), then Name reversed; the row link and its actions. */
export const SortableClients: StoryObj<typeof ClientsTable> = {
  render: (args) => <ClientsTable {...args} />,
  args: { onOpen: fn(), onBook: fn(), onCopy: fn() },
  play: async ({ canvas, args }) => {
    const table = within(canvas.getByRole('table', { name: 'Clients' }))
    const name = table.getByRole('columnheader', { name: 'Name' })
    const visits = table.getByRole('columnheader', { name: 'Visits' })
    await expect(visits).toHaveAttribute('aria-sort', 'descending')
    await expect(name).toHaveAttribute('aria-sort', 'none')
    await userEvent.click(within(name).getByRole('button', { name: 'Name' }))
    await waitFor(() => expect(name).toHaveAttribute('aria-sort', 'ascending'))
    await expect(visits).toHaveAttribute('aria-sort', 'none')
    await expect(table.getAllByRole('link')[0]).toHaveTextContent('Gülälek Nurmuhammedowa')
    await userEvent.click(within(name).getByRole('button', { name: 'Name' }))
    await waitFor(() => expect(name).toHaveAttribute('aria-sort', 'descending'))
    await expect(table.getAllByRole('link')[0]).toHaveTextContent('Mähribangül')
    // the icon action and the copy icon never open the row
    await userEvent.click(table.getByRole('button', { name: 'New booking for Jahan Muradowa' }))
    await expect(args.onBook).toHaveBeenCalledWith('Jahan Muradowa')
    await userEvent.click(table.getAllByRole('button', { name: 'Copy number' })[0]!)
    await expect(args.onCopy).toHaveBeenCalledOnce()
    await expect(args.onOpen).not.toHaveBeenCalled()
    // the row link opens the item
    await userEvent.click(table.getByRole('link', { name: 'Jahan Orazowa' }))
    await expect(args.onOpen).toHaveBeenCalledWith('Jahan Orazowa')
    // «+N» lists the rest of the tags
    await userEvent.click(table.getByRole('button', { name: '3 more tags' }))
    await waitFor(() => expect(within(document.body).getByRole('dialog')).toHaveTextContent('Colour client'))
  },
}

/** A6 at 390: the table scrolls inside its box (screens render list items instead). */
export const SortableClientsPhone: StoryObj<typeof ClientsTable> = {
  ...SortableClients,
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('table', { name: 'Clients' })).toBeVisible()
  },
}
