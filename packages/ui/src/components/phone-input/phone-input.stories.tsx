/** Phone — DS-Components → Inputs → «Telefon»: the country code in a fixed box, the digits grouped as typed. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Field } from '../field'
import { PhoneInput } from './phone-input'

// Turkmenistan's rules, as the apps pass them from the market (`MARKET.phone` in @yeral/domain)
const TM = { prefix: '+993', groups: [2, 2, 2, 2] } as const

function Demo({ initial = '', error }: { initial?: string; error?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <Field label="Telefon belgisi" error={error} className="max-w-90">
      <PhoneInput value={value} onValueChange={setValue} {...TM} />
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
