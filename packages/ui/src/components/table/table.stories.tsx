/** Data table — DS-Components → «Table with sort, filter and bulk actions» (business bookings). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowDown, ChevronDown, Download, MoreHorizontal, Phone, Search } from 'lucide-react'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Chip } from '../chip'
import { StatusBadge, type BookingStatus } from '../status-badge'
import { BulkBar } from '../bulk-bar'
import { CellNote, Table, TableCell, TableColumnHeader, TableFrame, TableHeader, TableRow, TableToolbar } from './table'

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
        <label className="flex h-9 w-60 items-center gap-2 rounded-s border border-n-300 px-3 text-small text-n-500">
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
            <TableCell className="tabular-nums">{r.time}</TableCell>
            <TableCell>
              <StatusBadge status={r.status}>{r.label}</StatusBadge>
            </TableCell>
            <TableCell>
              <Button variant="ghost" iconOnly size="s" aria-label={`Hereketler: ${r.name}`}>
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
