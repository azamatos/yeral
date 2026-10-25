/** Select — native, for fewer than 8 options (DS-Components → Inputs → «Etrap»; DS-Patterns → Select, sizes). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Field } from '../field'
import { Select } from './select'

const meta = {
  title: 'Inputs/Select',
  component: Select,
  render: (args) => (
    <Field label="Etrap" className="max-w-90">
      <Select {...args}>
        <option>Köpetdag</option>
        <option>Berkararlyk</option>
        <option>Bagtyýarlyk</option>
        <option>Büzmeýin</option>
      </Select>
    </Field>
  ),
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }

/** 48 in forms, 44 in settings rows (min 176), 40 for times (104 wide, tabular figures so a column lines up). */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Select aria-label="Duration" className="w-90">
        <option>1 h 30 min</option>
      </Select>
      <Select aria-label="Hold requests for" size="m" className="min-w-44">
        <option>10 min</option>
      </Select>
      <Select aria-label="Opens" size="s" className="w-26">
        <option>09:00</option>
      </Select>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Duration' }).offsetHeight).toBe(48)
    const hold = canvas.getByRole('combobox', { name: 'Hold requests for' })
    await expect(hold.offsetHeight).toBe(44)
    // «10 min» in Onest's own figures: the tabular «1» would leave a gap before the «0»
    await expect(getComputedStyle(hold).fontVariantNumeric).toBe('normal')
    const time = canvas.getByRole('combobox', { name: 'Opens' })
    await expect(time.offsetHeight).toBe(40)
    await expect(time.offsetWidth).toBe(104)
    await expect(getComputedStyle(time).fontVariantNumeric).toBe('tabular-nums')
  },
}
