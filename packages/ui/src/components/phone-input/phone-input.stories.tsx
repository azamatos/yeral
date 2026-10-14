/** Phone — DS-Components → Inputs → «Telefon»: fixed +993 box, 8 digits grouped as typed. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Field } from '../field'
import { PhoneInput } from './phone-input'

function Demo({ initial = '', error }: { initial?: string; error?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <Field label="Telefon belgisi" error={error} className="max-w-90">
      <PhoneInput value={value} onValueChange={setValue} />
    </Field>
  )
}

const meta = { title: 'Inputs/PhoneInput', component: Demo } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Telefon belgisi')
    await userEvent.type(input, '6590112299')
    await expect(input).toHaveValue('65 90 11 22')
  },
}

export const Incomplete: Story = { args: { initial: '651234', error: 'Belgi doly däl: 8 san bolmaly.' } }
