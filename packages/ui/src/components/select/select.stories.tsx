/** Select — native, for fewer than 8 options (DS-Components → Inputs → «Etrap»). */
import type { Meta, StoryObj } from '@storybook/react-vite'
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
