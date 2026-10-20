/**
 * Code boxes — DS-Patterns → 05 Inputs (the bare primitive inside SignInCodeStep): 4 boxes, numeric keyboard, paste
 * fills all, auto-check on the 4th digit. Timers, tries, the lock and resend live in Inputs/SignInCodeStep.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'
import { CodeInput, type CodeInputProps } from './code-input'

function Demo({ initial = '', ...props }: Omit<CodeInputProps, 'value' | 'onValueChange'> & { initial?: string }) {
  const [code, setCode] = useState(initial)
  return <CodeInput aria-label="Code" {...props} value={code} onValueChange={setCode} />
}

const meta = { title: 'Inputs/CodeInput', component: Demo, args: { onComplete: fn() } } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const input = canvas.getByLabelText('Code')
    await expect(input).toHaveAttribute('autocomplete', 'one-time-code')
    await expect(input).toHaveAttribute('inputmode', 'numeric')
    await userEvent.click(input)
    await userEvent.type(input, '12a34')
    await expect(input).toHaveValue('1234')
    await expect(args.onComplete).toHaveBeenCalledWith('1234')
    // a digit after a full code changes nothing and checks nothing again
    await userEvent.type(input, '5')
    await expect(input).toHaveValue('1234')
    await expect(args.onComplete).toHaveBeenCalledOnce()
  },
}

/** 56 business login · 52 phones · 48 client modal and booking step (gap 12, 10 at 48). */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <CodeInput aria-label="Code, 56" size={56} value="48" onValueChange={() => {}} />
      <CodeInput aria-label="Code, 52" size={52} value="48" onValueChange={() => {}} />
      <CodeInput aria-label="Code, 48" size={48} value="48" onValueChange={() => {}} />
    </div>
  ),
}

/** Paste fills every box, whatever spaces or words come with the digits. */
export const Paste: Story = {
  play: async ({ args, canvas }) => {
    const input = canvas.getByLabelText('Code')
    await userEvent.click(input)
    await userEvent.paste('Code: 43 21')
    await expect(input).toHaveValue('4321')
    await expect(args.onComplete).toHaveBeenCalledWith('4321')
  },
}

export const Invalid: Story = {
  name: 'Error',
  args: { initial: '4827', invalid: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Code')).toHaveAttribute('aria-invalid', 'true')
  },
}

/** Locked or rate-limited (SignInCodeStep). */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Code')).toBeDisabled()
  },
}

/** Checking: read-only n-50 boxes, the digits stay ink. */
export const Checking: Story = {
  args: { initial: '4821', readOnly: true, 'aria-busy': true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Code')).toHaveAttribute('readonly')
  },
}
