/**
 * Phone — DS-Patterns → 05 Inputs (the phone step of SignInCodeStep) and 02 Feedback → «Field messages»: the
 * country code in a fixed n-50 box, the digits grouped as typed; messages and the hint come from Field.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MARKET } from '@yeral/domain/market'
import { COUNTRY_PREFIX, formatNational } from '@yeral/domain/phone'
import { useState, type ReactNode } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Field, type FieldStatus } from '../field'
import { PhoneInput } from './phone-input'

// the market's rules, as the apps pass them (Turkmenistan: +993, 8 digits in pairs)
const TM = { prefix: COUNTRY_PREFIX, maxDigits: MARKET.phone.length, format: formatNational }

function Demo({
  initial = '',
  size,
  status,
  message,
  hint,
  label = 'Phone number',
}: {
  initial?: string
  size?: 48 | 44
  status?: FieldStatus
  message?: ReactNode
  hint?: ReactNode
  label?: string
}) {
  const [value, setValue] = useState(initial)
  return (
    <Field label={label} status={status} message={message} hint={hint} className="max-w-90">
      <PhoneInput value={value} onValueChange={setValue} size={size} placeholder="65 12 34 56" {...TM} />
    </Field>
  )
}

const meta = { title: 'Inputs/PhoneInput', component: Demo } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Phone number')
    await expect(input).toHaveAttribute('autocomplete', 'tel-national')
    await userEvent.type(input, '6590112299')
    await expect(input).toHaveValue('65 90 11 22')
  },
}

/** 44 in dense business panels (new booking, team, settings): 14 px text, the prefix box follows. */
export const Size44: Story = { args: { size: 44, initial: '65123456', label: 'Phone' } }

export const Incomplete: Story = {
  args: { initial: '651234', status: 'error', message: 'The number is incomplete — it needs 8 digits.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Phone number')).toHaveAttribute('aria-invalid', 'true')
    await expect(canvas.getByRole('alert')).toHaveTextContent('The number is incomplete — it needs 8 digits.')
  },
}

/** 8 digits that don't start with 6 or 7: codes go to mobile numbers only (checked after the length). */
export const MobileOnly: Story = {
  args: {
    initial: '12456789',
    status: 'error',
    message: 'Codes go to mobile numbers only. Enter a number starting with 6 or 7.',
  },
}

/** A business adds a client whose number is already saved (B-Clients): amber line, a link to the card. */
export const Warning: Story = {
  args: {
    initial: '65447019',
    label: 'Phone',
    status: 'warning',
    message: (
      <>
        This number belongs to Gülälek N. — <a href="#client">Open client card</a>
      </>
    ),
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Phone')
    await expect(input).toHaveAttribute('data-status', 'warning')
    await expect(input).not.toHaveAttribute('aria-invalid')
    await expect(canvas.getByRole('status')).toHaveTextContent('This number belongs to Gülälek N.')
  },
}

/** A number that isn't saved yet: a new client. */
export const Success: Story = {
  args: { initial: '65302218', label: 'Phone', status: 'success', message: 'This number isn’t saved yet — a new client' },
}

export const WithHint: Story = {
  args: { hint: 'If you already book on Ýeral as a client, use that number — one account works for both.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Phone number')).toHaveAccessibleDescription(
      'If you already book on Ýeral as a client, use that number — one account works for both.',
    )
  },
}

/** The SMS link page: the booking's number, masked on the server, read-only with a lock. */
export const MaskedReadOnly: Story = {
  render: () => (
    <Field label="Phone number" hint="The code goes only to the number on the booking." className="max-w-90">
      <PhoneInput masked="65 •• •• 22" prefix={COUNTRY_PREFIX} />
    </Field>
  ),
  play: async ({ canvas }) => {
    const number = canvas.getByRole('textbox', { name: 'Phone number' })
    await expect(number).toHaveAttribute('aria-readonly', 'true')
    await expect(number).toHaveAccessibleDescription('The code goes only to the number on the booking.')
  },
}

export const OnAPhone: Story = {
  name: 'On a phone (16 px text)',
  args: { initial: '65102030', hint: 'If you already book on Ýeral as a client, use that number — one account works for both.' },
  globals: { viewport: { value: 'xs' } },
}
