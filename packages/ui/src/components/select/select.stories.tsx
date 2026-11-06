/**
 * Select — DS-Controls → 03 Select · A2 (Sizes, States, LeadingIcon, Simple, Meta, Groups, Search, NoResults,
 * Multiple, LongList, PhoneSheet, RussianLength): our own list everywhere, never the native control. Stories are the
 * component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'
import { Field } from '../field'
import { MultiSelect, Select, type MultiSelectProps, type SelectProps } from './select'
import type { SelectEntry, SelectOption } from './option-list'

const specialists: SelectOption[] = [
  { value: 'jeren', label: 'Jeren' },
  { value: 'ayna', label: 'Aýna' },
  { value: 'maral', label: 'Maral' },
  { value: 'gulnar', label: 'Gülnar', meta: 'Off today', disabled: true },
  { value: 'leyli', label: 'Leýli' },
  { value: 'selbi', label: 'Selbi' },
]
const services: SelectOption[] = [
  { value: 'w-haircut', label: 'Women’s haircut', meta: '60 min' },
  { value: 'm-haircut', label: 'Men’s haircut', meta: '45 min' },
  { value: 'styling', label: 'Styling', meta: '45 min' },
  { value: 'colouring', label: 'Colouring', meta: '2 h' },
  { value: 'manicure', label: 'Manicure', meta: '60 min' },
  { value: 'pedicure', label: 'Pedicure', meta: '1 h 15 min' },
]
const grouped: SelectEntry[] = [
  { label: 'Hair', options: services.slice(0, 4) },
  { label: 'Nails', options: services.slice(4) },
  {
    label: 'Facials',
    options: [
      { value: 'cleansing', label: 'Cleansing facial', meta: '60 min' },
      { value: 'hydrating', label: 'Hydrating facial', meta: '1 h 15 min' },
    ],
  },
]
const colours: SelectOption[] = [
  ['Colouring', '2 h'],
  ['Colouring · roots', '1 h 30 min'],
  ['Colour correction', '3 h'],
  ['Colour refresh', '1 h'],
  ['Colour gloss', '45 min'],
  ['Colour + haircut', '2 h 30 min'],
  ['Colour removal', '2 h'],
  ['Colouring · men', '1 h'],
  ['Toner after colouring', '30 min'],
  ['Brow colouring', '20 min'],
  ['Lash colouring', '20 min'],
  ['Collagen mask', '30 min'],
  ['Collagen eye patches', '15 min'],
].map(([label, meta]) => ({ value: label!.toLowerCase().replace(/\W+/g, '-'), label: label!, meta }))
/** 100 services: the 13 «col» matches among 87 others. */
const many: SelectOption[] = [
  ...services.filter((s) => s.value !== 'colouring'),
  ...colours,
  ...Array.from({ length: 81 }, (_, i) => ({ value: `s${i}`, label: `Service ${i + 1}`, meta: `${30 + (i % 4) * 15} min` })),
]
const filters: SelectOption[] = [
  ['Women’s haircut', 12],
  ['Styling', 7],
  ['Colouring', 5],
  ['Men’s haircut', 4],
  ['Manicure', 9],
  ['Pedicure', 3],
  ['Gel polish', 6],
  ['Brow colouring', 2],
  ['Lash colouring', 1],
].map(([label, count]) => ({ value: String(label).toLowerCase().replace(/\W+/g, '-'), label: String(label), meta: count }))
const pad2 = (n: number) => String(n).padStart(2, '0')
const times: SelectOption[] = Array.from({ length: 96 }, (_, i) => ({
  value: String(i * 15),
  label: `${pad2(Math.floor(i / 4))}:${pad2((i % 4) * 15)}`,
}))

function Controlled({ value: initial, onValueChange, ...props }: SelectProps) {
  const [value, setValue] = useState(initial)
  return (
    <Select
      {...props}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onValueChange(next)
      }}
    />
  )
}

const meta = {
  title: 'Inputs/Select',
  component: Select,
  args: {
    options: specialists,
    value: 'jeren',
    onValueChange: fn(),
    title: 'Specialist',
    closeLabel: 'Close',
    searchPlaceholder: 'Search',
  },
  render: (args) => (
    <Field label="Specialist" className="w-60">
      <Controlled {...args} />
    </Field>
  ),
} satisfies Meta<typeof Select>
export default meta
type Story = StoryObj<typeof meta>

/** M 40: the field's label names the trigger; a click opens the list with Jeren chosen (600 + check), Esc closes it and the focus comes back. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Specialist' })
    await expect(trigger).toHaveTextContent('Jeren')
    await expect(trigger.offsetHeight).toBe(40)
    await userEvent.click(trigger)
    const list = await screen.findByRole('listbox')
    await waitFor(() => expect(list).toBeVisible())
    await expect(within(list).getAllByRole('option')).toHaveLength(6)
    await expect(within(list).getByRole('option', { name: 'Jeren' })).toHaveAttribute('aria-selected', 'true')
    await expect(within(list).getByRole('option', { name: /Gülnar/ })).toHaveAttribute('aria-disabled', 'true')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}

/** S 32 / r 8 (200 wide) · M 40 / r 10 (240) · L 48 / r 12 (280); icons 16 / 18 / 20. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-4">
      <Controlled {...args} size="s" aria-label="Specialist S" className="w-50" />
      <Controlled {...args} size="m" aria-label="Specialist M" className="w-60" />
      <Controlled {...args} size="l" aria-label="Specialist L" className="w-70" />
    </div>
  ),
  play: async ({ canvas }) => {
    const s = canvas.getByRole('combobox', { name: 'Specialist S' })
    await expect(s.offsetHeight).toBe(32)
    await expect(getComputedStyle(s).borderRadius).toBe('8px')
    await expect(canvas.getByRole('combobox', { name: 'Specialist M' }).offsetHeight).toBe(40)
    const l = canvas.getByRole('combobox', { name: 'Specialist L' })
    await expect(l.offsetHeight).toBe(48)
    await expect(getComputedStyle(l).borderRadius).toBe('12px')
  },
}

/** Rest, placeholder, disabled, error (the field's message), loading (a spinner for the chevron), a long value on one line. */
export const States: Story = {
  render: (args) => (
    <div className="grid w-60 gap-4">
      <Field label="Rest">
        <Controlled {...args} />
      </Field>
      <Field label="Placeholder">
        <Controlled {...args} value={null} placeholder="Any specialist" />
      </Field>
      <Field label="Disabled" disabled>
        <Controlled {...args} />
      </Field>
      <Field label="Error" error="Pick a specialist">
        <Controlled {...args} value={null} placeholder="Any specialist" />
      </Field>
      <Field label="Loading">
        <Controlled {...args} loading />
      </Field>
      <Field label="Long value">
        <Controlled {...args} options={[{ value: 'long', label: 'Jeren Annagulyýewa · senior colourist' }]} value="long" />
      </Field>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Placeholder' })).toHaveTextContent('Any specialist')
    await expect(canvas.getByRole('combobox', { name: 'Disabled' })).toBeDisabled()
    const error = canvas.getByRole('combobox', { name: 'Error' })
    await expect(error).toHaveAttribute('aria-invalid', 'true')
    await expect(error).toHaveAccessibleDescription('Pick a specialist')
  },
}

/** A leading icon (n-600, the size's icon) before the value. */
export const LeadingIcon: Story = {
  args: { options: [{ value: 'ashgabat', label: 'Ashgabat' }], value: 'ashgabat', icon: <MapPin aria-hidden strokeWidth={1.75} /> },
  render: (args) => (
    <Field label="City" className="w-60">
      <Controlled {...args} />
    </Field>
  ),
}

/** Six specialists, Gülnar off today: ↓ ↓ moves one highlight past the disabled row, Enter picks. */
export const Simple: Story = {
  play: async ({ canvas, args }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Specialist' })
    trigger.focus()
    await userEvent.keyboard('{ArrowDown}')
    const list = await screen.findByRole('listbox')
    await waitFor(() => expect(within(list).getByRole('option', { name: 'Jeren' })).toHaveAttribute('data-selected', 'true'))
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    await expect(within(list).getByRole('option', { name: 'Leýli' })).toHaveAttribute('data-selected', 'true')
    await userEvent.keyboard('{Enter}')
    await expect(args.onValueChange).toHaveBeenLastCalledWith('leyli')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    await expect(trigger).toHaveTextContent('Leýli')
  },
}

/** Durations on the right (13/18 n-500) line up because every row keeps the check column. */
export const WithMeta: Story = {
  args: { options: services, value: 'styling', title: 'Service' },
  render: (args) => (
    <Field label="Service" className="w-70">
      <Controlled {...args} />
    </Field>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Service' }))
    const list = await screen.findByRole('listbox')
    await waitFor(() => expect(list).toBeVisible())
    const rows = within(list).getAllByRole('option')
    await expect(rows[0]).toHaveTextContent('Women’s haircut60 min')
    await expect(rows[0]!.offsetHeight).toBe(36)
  },
}

/** Group headers (28 high, 11 caps, sticky) aren't options: ↑ ↓ skip them. */
export const Groups: Story = {
  args: { options: grouped, value: 'manicure', title: 'Service' },
  render: (args) => (
    <Field label="Service" className="w-70">
      <Controlled {...args} />
    </Field>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Service' }))
    const list = await screen.findByRole('listbox')
    await waitFor(() => expect(list).toBeVisible())
    await expect(within(list).getAllByRole('option')).toHaveLength(8)
    await expect(within(list).getByText('Nails')).toBeVisible()
    await expect(within(list).queryByRole('option', { name: 'Nails' })).not.toBeInTheDocument()
  },
}

/** Above 8 options a search sits at the top with the focus: «col» leaves the 13 matches (Collagen too), the match in 600, ↓ Enter picks. */
export const Search: Story = {
  args: { options: many, value: 'w-haircut', title: 'Service', empty: (q) => `Nothing matches “${q}”` },
  render: (args) => (
    <Field label="Service" className="w-80">
      <Controlled {...args} />
    </Field>
  ),
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Service' }))
    const search = await screen.findByPlaceholderText('Search')
    await waitFor(() => expect(search).toHaveFocus())
    await expect(search).toHaveAttribute('placeholder', 'Search')
    await userEvent.keyboard('col')
    const list = screen.getByRole('listbox')
    await waitFor(() => expect(within(list).getAllByRole('option')).toHaveLength(13))
    await expect(within(list).getByRole('option', { name: /Collagen mask/ })).toBeVisible()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await expect(args.onValueChange).toHaveBeenLastCalledWith('colouring-roots')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  },
}

/** Nothing matches: the typed text stays, the empty line (64 high, centred) says so, × clears it. */
export const NoResults: Story = {
  args: { options: many, value: 'w-haircut', title: 'Service', empty: (q) => `Nothing matches “${q}”` },
  render: (args) => (
    <Field label="Service" className="w-80">
      <Controlled {...args} />
    </Field>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Service' }))
    await waitFor(() => expect(screen.getByPlaceholderText('Search')).toHaveFocus())
    await userEvent.keyboard('xyz')
    await expect(await screen.findByText('Nothing matches “xyz”')).toBeVisible()
    await expect(screen.queryByRole('option')).not.toBeInTheDocument()
  },
}

function MultiControlled({ value: initial, onValueChange, ...props }: MultiSelectProps) {
  const [value, setValue] = useState(initial)
  return (
    <MultiSelect
      {...props}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onValueChange(next)
      }}
    />
  )
}

/** A filter: checkbox rows that apply at once, the trigger reads «Services · 3» in the active tint, Clear shows with a choice. */
export const Multiple: StoryObj<typeof MultiSelect> = {
  args: {
    options: filters,
    value: ['women-s-haircut', 'styling', 'colouring'],
    onValueChange: fn(),
    label: 'Services',
    title: 'Services',
    clearLabel: 'Clear',
    doneLabel: 'Show 24 results',
    closeLabel: 'Close',
    searchPlaceholder: 'Search',
    empty: (q) => `Nothing matches “${q}”`,
  },
  render: (args) => <MultiControlled {...args} />,
  play: async ({ canvas, args }) => {
    const trigger = canvas.getByRole('combobox', { name: 'Services · 3' })
    await expect(trigger).toHaveTextContent('Services · 3')
    await userEvent.click(trigger)
    const list = await screen.findByRole('listbox')
    await waitFor(() => expect(list).toBeVisible())
    await expect(list).toHaveAttribute('aria-multiselectable', 'true')
    await expect(within(list).getByRole('option', { name: /Styling/ })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(within(list).getByRole('option', { name: /Manicure/ }))
    await expect(args.onValueChange).toHaveBeenLastCalledWith(['women-s-haircut', 'styling', 'colouring', 'manicure'])
    await expect(list).toBeVisible()
    await expect(trigger).toHaveTextContent('Services · 4')
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await expect(args.onValueChange).toHaveBeenLastCalledWith([])
    await expect(trigger).toHaveTextContent('Services')
    await expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  },
}

/** 96 times at 15 minutes: the list opens with 13:00 in the middle, highlighted and chosen; ↑ ↓ continue from there. 128 wide. */
export const LongList: Story = {
  args: { options: times, value: '780', title: 'Break starts', listWidth: 'content', searchable: false },
  render: (args) => (
    <Field label="Break starts" className="w-26">
      <Controlled {...args} />
    </Field>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Break starts' }))
    const list = await screen.findByRole('listbox')
    await waitFor(() => expect(list).toBeVisible())
    const row = within(list).getByRole('option', { name: '13:00' })
    await expect(row).toHaveAttribute('aria-selected', 'true')
    await waitFor(async () => {
      const box = list.getBoundingClientRect()
      const at = row.getBoundingClientRect()
      await expect(at.top).toBeGreaterThan(box.top + box.height * 0.3)
      await expect(at.bottom).toBeLessThan(box.bottom - box.height * 0.3)
    })
    await expect(list.offsetHeight).toBe(320)
  },
}

/** 390: the list is a bottom sheet with a handle, the field's label, a close button and rows of 48; a tap picks and closes. */
export const PhoneSheet: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Specialist' }))
    const sheet = await screen.findByRole('dialog', { name: 'Specialist' })
    await waitFor(() => expect(sheet).toBeVisible())
    const rows = within(sheet).getAllByRole('option')
    await expect(rows).toHaveLength(6)
    await waitFor(() => expect(rows[0]!.offsetHeight).toBe(48))
    await expect(within(sheet).getByRole('button', { name: 'Close' })).toBeVisible()
    await userEvent.click(within(sheet).getByRole('option', { name: 'Maral' }))
    await expect(args.onValueChange).toHaveBeenLastCalledWith('maral')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  },
}

/** 390, a filter: search (L 48) at the top, checkbox rows, a sticky footer with Clear and «Show 24 results». */
export const PhoneMulti: StoryObj<typeof MultiSelect> = {
  ...Multiple,
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Services · 3' }))
    const sheet = await screen.findByRole('dialog', { name: 'Services' })
    await waitFor(() => expect(sheet).toBeVisible())
    await expect(within(sheet).getByRole('combobox', { name: 'Services' }).offsetHeight).toBe(48)
    await expect(within(sheet).getByRole('button', { name: 'Clear' })).toBeVisible()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Show 24 results' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  },
}

/** Russian is a third longer: one line with an ellipsis in a 200-wide S field, the whole label in the row. */
export const RussianLength: Story = {
  args: {
    options: [
      { value: 'any', label: 'Любой специалист' },
      { value: 'jeren', label: 'Джерен Аннагулыева · старший колорист' },
    ],
    value: 'jeren',
    title: 'Специалист',
    closeLabel: 'Закрыть',
  },
  render: (args) => (
    <Field label="Специалист" className="w-50">
      <Controlled {...args} size="s" />
    </Field>
  ),
}
