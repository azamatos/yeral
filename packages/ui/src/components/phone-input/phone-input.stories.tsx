/** Phone — DS-Components → Inputs → «Telefon»: the country code in a fixed box, the digits grouped as typed. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MARKET } from '@yeral/domain/market'
import { COUNTRY_PREFIX, formatNational } from '@yeral/domain/phone'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Field } from '../field'
import { PhoneInput } from './phone-input'

// the market's rules, as the apps pass them (Turkmenistan: +993, 8 digits in pairs)
const TM = { prefix: COUNTRY_PREFIX, maxDigits: MARKET.phone.length, format: formatNational }

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
