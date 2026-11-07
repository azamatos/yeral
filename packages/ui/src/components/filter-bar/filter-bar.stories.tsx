/**
 * FilterBar — DS-Lists A5 (Rest, Searching, Active, SingleMenu, MultiAtScale, Sort, Disabled, DisabledHint, PlainDefault,
 * SearchedElsewhere, Phone, PhoneSheet): one bar for every list. Stories are the component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'
import { Button } from '../button'
import type { SelectGroup } from '../select'
import { FilterBar, type FilterBarLabels } from './filter-bar'

const labels: FilterBarLabels = {
  filters: 'Filters',
  clearAll: 'Clear all',
  clear: 'Clear',
  close: 'Close',
  back: 'Back',
  showResults: 'Show results',
  searchIn: 'Search',
  remove: (chip) => `Remove ${chip}`,
  nothingMatches: (q) => `Nothing matches “${q}”`,
}

const people = [
  'Aýna',
  'Maral',
  'Jeren',
  'Leýli',
  'Ogulgerek Durdyýewa',
  'Bahar Myradowa',
  'Aýgözel Hanmyradowa',
  'Mähri Gurbanowa',
  'Läle Orazowa',
  'Enejan Atayewa',
]
const specialists = people.map((name, i) => ({ value: `p${i}`, label: name, meta: String(41 - i * 4) }))

/** 100 services in 15 groups, as the Bookings menu holds them at real scale. */
const groupNames = [
  'Hair',
  'Colouring',
  'Packages',
  'Bridal',
  'Nails',
  'Brows',
  'Lashes',
  'Face',
  'Massage',
  'Body',
  'Waxing',
  'Makeup',
  'Men',
  'Kids',
  'Spa',
]
const services: SelectGroup[] = groupNames.map((group, g) => ({
  label: group,
  options: Array.from({ length: g < 10 ? 7 : 6 }, (_, i) => ({
    value: `s${g}-${i}`,
    label:
      g === 1
        ? ['Root colour', 'Full colour', 'Colour refresh', 'Colour correction', 'Toning', 'Balayage', 'Highlights'][i]!
        : `${group} service ${i + 1}`,
    meta: `${30 + i * 15} min`,
  })),
}))
const statuses = [
  { value: 'confirmed', label: 'Confirmed', meta: '24' },
  { value: 'pending', label: 'Request', meta: '5' },
  { value: 'arrived', label: 'Arrived', meta: '3' },
]
const sorts = [
  { value: 'soonest', label: 'Time, soonest first' },
  { value: 'latest', label: 'Time, latest first' },
  { value: 'booked', label: 'Booked, newest first' },
]

type State = { q: string; staff: string | null; services: string[]; status: string[]; sort: string; distance: string | null }

function Harness({
  initial,
  disabled,
  disabledHint,
  distance,
  searched,
}: {
  initial?: Partial<State>
  disabled?: boolean
  /** Why Specialist is off: a tooltip instead of a dead button. */
  disabledHint?: string
  /** A Distance filter whose «Within 5 km» is the plain default. */
  distance?: boolean
  /** The query lives in a header bar: the count shows with nothing chosen. */
  searched?: boolean
}) {
  const [s, setS] = useState<State>({ q: '', staff: null, services: [], status: [], sort: 'soonest', distance: null, ...initial })
  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }))
  const shown = Math.max(0, 214 - s.services.length * 40 - (s.staff ? 120 : 0) - s.status.length * 20 - s.q.length * 50)
  return (
    <FilterBar
      labels={labels}
      search={searched ? undefined : { value: s.q, onChange: (q) => set({ q }), placeholder: 'Client, phone or booking code' }}
      searched={searched}
      filters={[
        ...(distance
          ? [
              {
                id: 'distance',
                label: 'Distance',
                plain: '5',
                options: [1, 3, 5, 10, 25].map((km) => ({ value: String(km), label: `Within ${km} km` })),
                value: s.distance,
                onValueChange: (v: string | null) => set({ distance: v }),
                chip: (o: { label: string }) => `Distance: ${o.label.replace('Within ', '')}`,
              },
            ]
          : []),
        {
          id: 'staff',
          label: 'Specialist',
          anyLabel: 'Anyone',
          options: specialists,
          value: s.staff,
          onValueChange: (staff) => set({ staff }),
          disabled,
          disabledHint,
        },
        {
          id: 'service',
          label: 'Services',
          multiple: true,
          options: services,
          value: s.services,
          onValueChange: (v) => set({ services: v }),
        },
        { id: 'status', label: 'Status', multiple: true, options: statuses, value: s.status, onValueChange: (v) => set({ status: v }) },
      ]}
      sort={{ label: 'Sort', value: s.sort, options: sorts, onValueChange: (sort) => set({ sort }) }}
      count={`${shown} of 214 bookings`}
      action={
        <Button size="m">
          <Plus aria-hidden />
          New booking
        </Button>
      }
    />
  )
}

const meta = {
  title: 'Data/FilterBar',
  component: Harness,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

/** One M 40 row: Search · Specialist · Services · Status · Sort · New booking; nothing active, no second row. */
export const Rest: Story = {
  play: async ({ canvas }) => {
    const specialist = canvas.getByRole('combobox', { name: 'Specialist' })
    await expect(specialist.offsetHeight).toBe(40)
    await expect(canvas.getByRole('textbox', { name: 'Client, phone or booking code' }).offsetHeight).toBe(40)
    await expect(canvas.getByRole('button', { name: 'Sort: Time, soonest first' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
    await expect(canvas.queryByText(/of 214 bookings/)).not.toBeInTheDocument()
  },
}

/** Typing shows the second row with only the count; nothing to clear. */
export const Searching: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('textbox'), 'jah')
    await expect(canvas.getByText('64 of 214 bookings')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
  },
}

/** Two filters on: the triggers read «Specialist · Jeren» and «Services · 2»; one chip per value, × removes one, Clear all the rest. */
export const Active: Story = {
  args: { initial: { staff: 'p2', services: ['s1-0', 's1-1'] } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Specialist · Jeren' })).toHaveTextContent('Specialist · Jeren')
    await expect(canvas.getByRole('combobox', { name: 'Services · 2' })).toBeVisible()
    await expect(canvas.getByText('Specialist: Jeren')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Services: Root colour' }))
    await expect(canvas.getByRole('combobox', { name: 'Services · 1' })).toBeVisible()
    await expect(canvas.getByText('54 of 214 bookings')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all' }))
    await expect(canvas.getByRole('combobox', { name: 'Specialist' })).toBeVisible()
    await expect(canvas.queryByText(/Specialist: /)).not.toBeInTheDocument()
  },
}

/** A single menu: search inside above 8 rows, «Anyone» first; a pick applies, closes and tints the trigger; «Anyone» clears it. */
export const SingleMenu: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Specialist' }))
    const list = await screen.findByRole('listbox')
    await expect(within(list).getByRole('option', { name: /Anyone/ })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('ogul')
    await expect(within(list).getAllByRole('option')).toHaveLength(1)
    await userEvent.click(within(list).getByRole('option', { name: /Ogulgerek/ }))
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    await expect(canvas.getByRole('combobox', { name: 'Specialist · Ogulgerek Durdyýewa' })).toHaveFocus()
    await userEvent.click(canvas.getByRole('combobox', { name: /Specialist ·/ }))
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: /Anyone/ }))
    await expect(canvas.getByRole('combobox', { name: 'Specialist' })).toBeVisible()
  },
}

/** 100 services in 15 groups: ticks apply at once and keep the menu open; typing «colour» searches every group. */
export const MultiAtScale: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Services' }))
    const list = await screen.findByRole('listbox')
    await userEvent.click(within(list).getByRole('option', { name: /Hair service 1/ }))
    await userEvent.type(screen.getByPlaceholderText('Search'), 'colour')
    await waitFor(() => expect(within(list).getAllByRole('option')).toHaveLength(4))
    await userEvent.click(within(list).getByRole('option', { name: /Root colour/ }))
    await expect(screen.getByRole('listbox')).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Services · 2' })).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await expect(canvas.getByText('Services: Root colour')).toBeVisible()
  },
}

/** Sort: the options carry the direction, a check on the current one. */
export const Sort: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Sort: Time, soonest first' }))
    const list = await screen.findByRole('listbox')
    await expect(within(list).getByRole('option', { name: 'Time, soonest first' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(within(list).getByRole('option', { name: 'Booked, newest first' }))
    await expect(canvas.getByRole('button', { name: 'Sort: Booked, newest first' })).toBeVisible()
  },
}

/** A disabled filter can't open. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Specialist' })).toBeDisabled()
  },
}

/** Off with a reason: the button keeps focus for its tooltip, looks disabled and opens nothing. */
export const DisabledHint: Story = {
  args: { disabled: true, disabledHint: 'Pick a service first' },
  play: async ({ canvas }) => {
    const specialist = canvas.getByRole('combobox', { name: 'Specialist' })
    await expect(specialist).toHaveAttribute('aria-disabled', 'true')
    await userEvent.hover(specialist)
    await expect(await screen.findByRole('tooltip')).toHaveTextContent('Pick a service first')
    await userEvent.click(specialist)
    await expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  },
}

/** A plain default: «Within 5 km» is checked with nothing chosen and no «Anyone» row; another radius tints and chips; the default clears. */
export const PlainDefault: Story = {
  args: { distance: true },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Distance' }))
    const list = await screen.findByRole('listbox')
    await expect(within(list).queryByRole('option', { name: /Anyone/ })).not.toBeInTheDocument()
    await expect(within(list).getByRole('option', { name: /Within 5 km/ })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(within(list).getByRole('option', { name: /Within 10 km/ }))
    await expect(canvas.getByRole('combobox', { name: 'Distance · Within 10 km' })).toBeVisible()
    await expect(canvas.getByText('Distance: 10 km')).toBeVisible()
    await userEvent.click(canvas.getByRole('combobox', { name: 'Distance · Within 10 km' }))
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: /Within 5 km/ }))
    await expect(canvas.getByRole('combobox', { name: 'Distance' })).toBeVisible()
    await expect(canvas.queryByText(/Distance: /)).not.toBeInTheDocument()
  },
}

/** The query lives in a header bar (client search): the count shows on row 2 with nothing chosen, Clear all only with chips. */
export const SearchedElsewhere: Story = {
  args: { searched: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('textbox')).not.toBeInTheDocument()
    await expect(canvas.getByText('214 of 214 bookings')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
  },
}

/** 390: the search on its own row, then «Filters 2», the count and Sort as an icon; the chips under them. */
export const Phone: Story = {
  args: { initial: { staff: 'p2', status: ['pending'] } },
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Filters 2' })).toBeVisible()
    await expect(canvas.queryByRole('combobox', { name: /Specialist/ })).not.toBeInTheDocument()
    await expect(canvas.getByText('Status: Request')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Sort: Time, soonest first' })).toBeVisible()
  },
}

/** The Filters sheet: short filters inline, a long one opens its own list with search, Back returns; Show results closes. */
export const PhoneSheet: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })
    await userEvent.click(within(sheet).getByRole('option', { name: /Request/ }))
    await userEvent.click(within(sheet).getByRole('button', { name: /Specialist/ }))
    await expect(await screen.findByRole('dialog', { name: 'Specialist' })).toBeVisible()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('option', { name: /Maral/ }))
    await expect(within(screen.getByRole('dialog', { name: 'Filters' })).getByText('Maral')).toBeVisible()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Show results' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(canvas.getByRole('button', { name: 'Filters 2' })).toBeVisible()
  },
}
