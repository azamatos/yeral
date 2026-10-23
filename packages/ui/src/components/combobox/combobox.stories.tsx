/**
 * Combobox — DS-Patterns → Inputs «Combobox» (suggestions, results, no results + create, option with icon); used by
 * B-Onboarding's address step and B-Calendar's new booking. Stories are the component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { Avatar } from '../avatar'
import { Field } from '../field'
import { Combobox, ComboboxInput, ComboboxList, type ComboboxOption, type ComboboxProps } from './combobox'

const clients: ComboboxOption[] = [
  { id: 'g', label: 'Gülälek N.', description: '+993 65 44 70 19', icon: <Avatar name="Gülälek" size={40} /> },
  { id: 's', label: 'Sona P.', description: '+993 62 33 81 07', icon: <Avatar name="Sona" size={40} /> },
  { id: 'o', label: 'Ogulnabat Ç.', description: '+993 62 18 60 05', icon: <Avatar name="Ogulnabat" size={40} /> },
]

const pin = <MapPin aria-hidden strokeWidth={1.75} />
const addresses: ComboboxOption[] = [
  { id: 'a1', label: '247 Bitarap Türkmenistan Avenue', description: 'Building · next to the shopping centre · Ashgabat', icon: pin },
  { id: 'a2', label: '247/1 Bitarap Türkmenistan Avenue', description: 'Building · inside the courtyard · Ashgabat', icon: pin },
  { id: 'a3', label: 'Bitarap Türkmenistan Avenue', description: 'Street · you place the pin yourself · Ashgabat', icon: pin },
]

type Args = Omit<ComboboxProps, 'value' | 'onValueChange' | 'children'> & { initial?: string; label: string; placeholder?: string }

function Demo({ initial = '', label, placeholder, ...props }: Args) {
  const [value, setValue] = useState(initial)
  return (
    <Combobox {...props} value={value} onValueChange={setValue}>
      <div className="flex max-w-120 flex-col gap-2">
        <Field label={label}>
          <ComboboxInput placeholder={placeholder} size={props.variant === 'address' ? 'l' : 'm'} />
        </Field>
        <ComboboxList />
      </div>
    </Combobox>
  )
}

const meta = {
  title: 'Inputs/Combobox',
  component: Demo,
  args: {
    label: 'Client',
    placeholder: 'Name or phone number',
    listLabel: 'Clients',
    options: clients,
    onSelect: fn(),
  },
} satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

const open = async (canvasElement: HTMLElement) => {
  const input = within(canvasElement).getByRole('combobox')
  await userEvent.click(input)
  return input
}

/** Open before typing: the section label, frequent clients and the create row last. */
export const Suggestions: Story = {
  args: {
    section: 'Frequent clients',
    create: { label: 'Create a new client', icon: <Plus aria-hidden strokeWidth={2} />, onSelect: fn() },
  },
  play: async ({ canvasElement, canvas }) => {
    const input = await open(canvasElement)
    await expect(input).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getAllByRole('option')).toHaveLength(4)
    await expect(canvas.getAllByRole('option').at(-1)).toHaveTextContent('Create a new client')
  },
}

/** ↓ ↓ Enter picks the second option; the input keeps the focus and the list closes. */
export const Keyboard: Story = {
  play: async ({ canvasElement, canvas, args }) => {
    const input = await open(canvasElement)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    const second = canvas.getAllByRole('option')[1]!
    await expect(second).toHaveAttribute('aria-selected', 'true')
    await expect(input).toHaveAttribute('aria-activedescendant', second.id)
    await userEvent.keyboard('{Enter}')
    await expect(args.onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 's' }))
    await expect(input).toHaveFocus()
    await expect(canvas.queryByRole('listbox')).toBeNull()
  },
}

/** Esc closes the list; typing opens it again. */
export const Escape: Story = {
  play: async ({ canvasElement, canvas }) => {
    await open(canvasElement)
    await userEvent.keyboard('{Escape}')
    await expect(canvas.queryByRole('listbox')).toBeNull()
    await userEvent.keyboard('S')
    await expect(canvas.getByRole('listbox')).toBeVisible()
  },
}

/** A tap picks an option. */
export const Tap: Story = {
  play: async ({ canvasElement, canvas, args }) => {
    await open(canvasElement)
    await userEvent.click(canvas.getByRole('option', { name: /Ogulnabat/ }))
    await expect(args.onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'o' }))
  },
}

/** Nothing matches: the empty line, and the create row stays. */
export const NoResults: Story = {
  args: {
    initial: '65 99 00',
    options: [],
    empty: 'No client found for “65 99 00”',
    create: { label: 'Create a new client · +993 65 99 00', icon: <Plus aria-hidden strokeWidth={2} />, onSelect: fn() },
  },
  play: async ({ canvasElement, canvas }) => {
    await open(canvasElement)
    await expect(canvas.getByRole('status')).toHaveTextContent('No client found')
    await expect(canvas.getAllByRole('option')).toHaveLength(1)
  },
}

/** B-Onboarding's address: the padded list, a pin icon on each row, the city in the caption. */
export const Address: Story = {
  args: {
    variant: 'address',
    label: 'Address',
    placeholder: 'Street and building number',
    listLabel: 'Address suggestions',
    initial: '247 Bitarap',
    options: addresses,
  },
  play: async ({ canvasElement, canvas }) => {
    await open(canvasElement)
    await expect(canvas.getByRole('listbox', { name: 'Address suggestions' })).toBeVisible()
    await expect(canvas.getAllByRole('option')).toHaveLength(3)
  },
}

/** Closed while there's nothing to ask yet (fewer letters than the search needs). */
export const Closed: Story = {
  args: { open: false },
  play: async ({ canvasElement, canvas }) => {
    const input = await open(canvasElement)
    await expect(input).toHaveAttribute('aria-expanded', 'false')
    await expect(canvas.queryByRole('listbox')).toBeNull()
  },
}
