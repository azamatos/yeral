/** SMS code — Auth board: 4 boxes, numeric keyboard, paste fills all, auto-submit on the 4th digit. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'
import { CodeInput } from './code-input'

function Demo({ onComplete, invalid, disabled }: { onComplete?: (c: string) => void; invalid?: boolean; disabled?: boolean }) {
  const [code, setCode] = useState('')
  return (
    <CodeInput aria-label="SMS kod" value={code} onValueChange={setCode} onComplete={onComplete} invalid={invalid} disabled={disabled} />
  )
}

const meta = { title: 'Inputs/CodeInput', component: Demo, args: { onComplete: fn() } } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const input = canvas.getByLabelText('SMS kod')
    await userEvent.click(input)
    await userEvent.type(input, '12a34')
    await expect(input).toHaveValue('1234')
    await expect(args.onComplete).toHaveBeenCalledWith('1234')
  },
}

export const Paste: Story = {
  play: async ({ args, canvas }) => {
    const input = canvas.getByLabelText('SMS kod')
    await userEvent.click(input)
    await userEvent.paste('4321')
    await expect(args.onComplete).toHaveBeenCalledWith('4321')
  },
}

export const Wrong: Story = { args: { invalid: true } }
export const Locked: Story = { args: { disabled: true } }
