/** Filter chips — DS-Components → Selection: tint when on; Search's category row and filters. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Chip, ChipRadioGroup } from './chip'

const meta = { title: 'Selection/Chip', component: Chip, args: { children: 'Bahasy' } } satisfies Meta<typeof Chip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Selected: Story = { args: { selected: true, children: 'Reýting 4,5+' } }
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip selected>
        <SlidersHorizontal />
        Süzgüçler · 2
      </Chip>
      <Chip>
        Hünärmen
        <ChevronDown />
      </Chip>
    </div>
  ),
}

function CategoryRow() {
  const [on, setOn] = useState('Ählisi')
  return (
    <div className="flex gap-2 overflow-x-auto">
      {['Ählisi', 'Gözellik', 'Dellekhana', 'Diş lukmany', 'Restoran', 'Sport'].map((c) => (
        <Chip key={c} selected={on === c} onClick={() => setOn(c)}>
          {c}
        </Chip>
      ))}
    </div>
  )
}

export const CategoryFilter: Story = {
  render: () => <CategoryRow />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Restoran' }))
    await expect(canvas.getByRole('button', { name: 'Restoran' })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('button', { name: 'Ählisi' })).toHaveAttribute('aria-pressed', 'false')
  },
}

function PriceTypes() {
  const [type, setType] = useState('fixed')
  return (
    <ChipRadioGroup
      aria-label="Price"
      value={type}
      onValueChange={setType}
      options={[
        { value: 'fixed', label: 'Fixed' },
        { value: 'from', label: 'From' },
        { value: 'free', label: 'Free' },
        { value: 'hidden', label: 'Price at the place' },
      ]}
    />
  )
}

/** One choice as chips (B-Services «Price»): a radio group, the chosen one in the tint, arrow keys between them. */
/** An option that can't be picked now: the arrows pass it over (the new booking's specialists who don't do the services). */
export const RadioChipDisabled: Story = {
  render: () => (
    <ChipRadioGroup
      aria-label="Specialist"
      defaultValue="ayna"
      options={[
        { value: 'ayna', label: 'Aýna' },
        { value: 'maral', label: 'Maral', disabled: true },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Maral' })).toBeDisabled()
  },
}

export const RadioChips: Story = {
  render: () => <PriceTypes />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Fixed' })).toBeChecked()
    await userEvent.click(canvas.getByRole('radio', { name: 'Free' }))
    await expect(canvas.getByRole('radio', { name: 'Free' })).toBeChecked()
    await expect(canvas.getByRole('radio', { name: 'Free' })).not.toHaveAttribute('aria-pressed')
    await userEvent.keyboard('{ArrowRight}')
    await expect(canvas.getByRole('radio', { name: 'Price at the place' })).toHaveFocus()
  },
}

/** S 32 (active-filter chips in a toolbar) and M 40 (client category and quick filters); the ring follows the pill (A11). */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Chip {...args} size="s">
        Free today
      </Chip>
      <Chip {...args} size="s" selected>
        <SlidersHorizontal />
        Specialist: Jeren
      </Chip>
      <Chip {...args} size="m">
        Hair
      </Chip>
      <Chip {...args} size="m" selected>
        Nails
      </Chip>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Free today' }).getBoundingClientRect().height).toBe(32)
    await expect(canvas.getByRole('button', { name: 'Hair' }).getBoundingClientRect().height).toBe(40)
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Free today' })).toHaveFocus()
  },
}
